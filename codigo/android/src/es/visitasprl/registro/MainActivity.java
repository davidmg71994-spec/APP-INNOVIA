package es.visitasprl.registro;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.hardware.biometrics.BiometricManager;
import android.hardware.biometrics.BiometricPrompt;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.SystemClock;
import android.os.Environment;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Visitas PRL: la app web (index.html y sus archivos) va dentro del APK, en assets/www.
 * Se sirve en una dirección https propia que nunca sale a internet, para que el navegador
 * del sistema la trate como una web segura (guardar registros, cámara, etc.).
 *
 * Seguridad (1.18.0):
 *  - Cualquier petición a otro servidor se bloquea aquí (la app no puede enviar datos fuera).
 *    Los enlaces que pulsa el usuario (BOE, normativa) se abren en el navegador, fuera de la app.
 *  - Bloqueo de la app con el bloqueo del propio móvil (BiometricPrompt / KeyguardManager).
 *  - Opción de impedir capturas de pantalla (FLAG_SECURE).
 */
public class MainActivity extends Activity {

    static final String HOST = "app.visitasprl.local";
    static final String START = "https://" + HOST + "/index.html";
    static final int REQ_ARCHIVO = 1;
    static final int REQ_DESBLOQUEO = 2;

    private WebView web;
    private ValueCallback<Uri[]> archivoCallback;
    private Uri fotoUri;
    private long paradaMs = 0;

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowFileAccessFromFileURLs(false);
        s.setAllowUniversalAccessFromFileURLs(false);
        s.setAllowContentAccess(true);
        s.setGeolocationEnabled(false);
        s.setSaveFormData(false);
        s.setTextZoom(100);
        s.setMediaPlaybackRequiresUserGesture(true);
        if (Build.VERSION.SDK_INT >= 26) s.setSafeBrowsingEnabled(true);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (HOST.equals(u.getHost())) return servir(u.getPath());
                // nada sale a internet: cualquier otra petición de red se corta aquí
                String sc = u.getScheme() == null ? "" : u.getScheme().toLowerCase();
                if (sc.equals("http") || sc.equals("https") || sc.equals("ws") || sc.equals("wss") || sc.equals("ftp")) return bloqueado();
                return null;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (HOST.equals(u.getHost())) return false;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, u));
                } catch (ActivityNotFoundException e) {
                    aviso("No hay ninguna app para abrir este enlace.");
                }
                return true;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> cb, FileChooserParams p) {
                return elegirArchivo(cb, p);
            }
        });

        web.addJavascriptInterface(new Puente(this), "AndroidApp");
        limpiarCache();

        if (saved != null) web.restoreState(saved);
        if (web.getUrl() == null) web.loadUrl(START);
    }

    /* ---------- archivos de la app (assets/www) ---------- */

    private static final Map<String, String> TIPOS = new HashMap<String, String>();
    static {
        TIPOS.put("html", "text/html");
        TIPOS.put("js", "application/javascript");
        TIPOS.put("mjs", "application/javascript");
        TIPOS.put("wasm", "application/wasm");
        TIPOS.put("pdf", "application/pdf");
        TIPOS.put("css", "text/css");
        TIPOS.put("json", "application/json");
        TIPOS.put("webmanifest", "application/manifest+json");
        TIPOS.put("png", "image/png");
        TIPOS.put("jpg", "image/jpeg");
        TIPOS.put("jpeg", "image/jpeg");
        TIPOS.put("svg", "image/svg+xml");
        TIPOS.put("woff2", "font/woff2");
        TIPOS.put("ttf", "font/ttf");
    }

    private WebResourceResponse servir(String path) {
        if (path == null || path.equals("") || path.equals("/")) path = "/index.html";
        if (path.contains("..")) return noEncontrado();
        String ext = path.substring(path.lastIndexOf('.') + 1).toLowerCase();
        String tipo = TIPOS.containsKey(ext) ? TIPOS.get(ext) : "application/octet-stream";
        try {
            InputStream in = getAssets().open("www" + path);
            WebResourceResponse r = new WebResourceResponse(tipo, "UTF-8", in);
            Map<String, String> h = new HashMap<String, String>();
            h.put("Cache-Control", "no-cache");
            r.setResponseHeaders(h);
            return r;
        } catch (IOException e) {
            return noEncontrado();
        }
    }

    private WebResourceResponse bloqueado() {
        return new WebResourceResponse("text/plain", "UTF-8", 403, "Forbidden",
                new HashMap<String, String>(), new ByteArrayInputStream(new byte[0]));
    }

    private WebResourceResponse noEncontrado() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found",
                new HashMap<String, String>(), new ByteArrayInputStream(new byte[0]));
    }

    /* ---------- cámara y galería ---------- */

    private boolean elegirArchivo(ValueCallback<Uri[]> cb, WebChromeClient.FileChooserParams p) {
        if (archivoCallback != null) archivoCallback.onReceiveValue(null);
        archivoCallback = cb;
        fotoUri = null;

        String[] acc = p.getAcceptTypes();
        boolean imagen = acc != null && acc.length > 0 && acc[0] != null && acc[0].startsWith("image");
        boolean soloPdf = acc != null && acc.length > 0;
        if (acc != null) for (String t : acc) {
            String x = t == null ? "" : t.trim().toLowerCase();
            if (!x.equals("application/pdf") && !x.equals(".pdf")) soloPdf = false;
        }
        Intent intent;
        if (p.isCaptureEnabled() && imagen) {
            File dir = new File(getCacheDir(), "fotos");
            dir.mkdirs();
            File f = new File(dir, "foto_" + System.currentTimeMillis() + ".jpg");
            fotoUri = ArchivosProvider.uriPara(f);
            intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            intent.putExtra(MediaStore.EXTRA_OUTPUT, fotoUri);
            intent.setClipData(ClipData.newRawUri("foto", fotoUri));
            intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        } else {
            intent = new Intent(Intent.ACTION_GET_CONTENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType(imagen ? "image/*" : soloPdf ? "application/pdf" : "*/*");
            if (p.getMode() == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE) {
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
            }
        }
        try {
            startActivityForResult(intent, REQ_ARCHIVO);
        } catch (ActivityNotFoundException e) {
            archivoCallback.onReceiveValue(null);
            archivoCallback = null;
            aviso(fotoUri != null ? "No se encontró la app de cámara." : "No se encontró ninguna app para elegir archivos.");
        }
        return true;
    }

    /* ---------- bloqueo de la app con el bloqueo del móvil ---------- */

    boolean dispositivoSeguro() {
        KeyguardManager km = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
        return km != null && km.isDeviceSecure();
    }

    void pedirDesbloqueo() {
        if (!dispositivoSeguro()) { resultadoDesbloqueo(true, ""); return; }
        if (Build.VERSION.SDK_INT >= 29) {
            try {
                BiometricPrompt.Builder b = new BiometricPrompt.Builder(this)
                        .setTitle("Visitas PRL")
                        .setSubtitle("Desbloquea para ver tus registros");
                if (Build.VERSION.SDK_INT >= 30) {
                    b.setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_WEAK
                            | BiometricManager.Authenticators.DEVICE_CREDENTIAL);
                } else {
                    b.setDeviceCredentialAllowed(true);
                }
                b.build().authenticate(new CancellationSignal(), getMainExecutor(),
                        new BiometricPrompt.AuthenticationCallback() {
                            @Override
                            public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult r) {
                                resultadoDesbloqueo(true, "");
                            }

                            @Override
                            public void onAuthenticationError(int codigo, CharSequence msg) {
                                resultadoDesbloqueo(false, msg == null ? "" : msg.toString());
                            }
                        });
                return;
            } catch (Exception e) {
                // si falla, se usa la pantalla de bloqueo del sistema
            }
        }
        KeyguardManager km = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
        Intent i = km == null ? null : km.createConfirmDeviceCredentialIntent("Visitas PRL", "Desbloquea para ver tus registros");
        if (i == null) { resultadoDesbloqueo(true, ""); return; }
        try {
            startActivityForResult(i, REQ_DESBLOQUEO);
        } catch (Exception e) {
            resultadoDesbloqueo(false, "No se pudo abrir el desbloqueo del móvil");
        }
    }

    void resultadoDesbloqueo(final boolean ok, final String msg) {
        runOnUiThread(new Runnable() {
            public void run() {
                if (web != null) web.evaluateJavascript("window.SEG_API&&SEG_API.resultado(" + ok + "," + JSONObject.quote(msg) + ")", null);
            }
        });
    }

    @Override
    protected void onStop() {
        super.onStop();
        paradaMs = SystemClock.elapsedRealtime();
    }

    @Override
    protected void onStart() {
        super.onStart();
        if (paradaMs > 0 && web != null) {
            long fuera = SystemClock.elapsedRealtime() - paradaMs;
            paradaMs = 0;
            web.evaluateJavascript("window.SEG_API&&SEG_API.vuelve(" + fuera + ")", null);
        }
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req == REQ_DESBLOQUEO) {
            resultadoDesbloqueo(res == RESULT_OK, res == RESULT_OK ? "" : "No se ha desbloqueado");
            return;
        }
        if (req != REQ_ARCHIVO || archivoCallback == null) return;
        Uri[] r = null;
        if (res == RESULT_OK) {
            if (fotoUri != null) {
                r = new Uri[]{fotoUri};
            } else if (data != null) {
                ClipData c = data.getClipData();
                if (c != null && c.getItemCount() > 0) {
                    r = new Uri[c.getItemCount()];
                    for (int i = 0; i < c.getItemCount(); i++) r[i] = c.getItemAt(i).getUri();
                } else if (data.getData() != null) {
                    r = new Uri[]{data.getData()};
                }
            }
        }
        archivoCallback.onReceiveValue(r);
        archivoCallback = null;
        fotoUri = null;
    }

    /* ---------- puente con la página: compartir, guardar, copiar ---------- */

    private static class Puente {
        private final MainActivity a;
        private volatile Uri ultimoGuardado;

        Puente(MainActivity a) {
            this.a = a;
        }

        @JavascriptInterface
        public void compartir(String b64, String nombre, String tipo) {
            compartirTexto(b64, nombre, tipo, null);
        }

        /**
         * Comparte el archivo con un mensaje ya escrito: el correo lo pone en el cuerpo y WhatsApp
         * como texto del documento. Además lo deja copiado, por si alguna app no lo usa.
         */
        @JavascriptInterface
        public void compartirTexto(final String b64, final String nombre, final String tipo, final String texto) {
            a.runOnUiThread(new Runnable() {
                public void run() {
                    try {
                        File dir = new File(a.getCacheDir(), "compartir");
                        dir.mkdirs();
                        File f = new File(dir, limpio(nombre));
                        escribir(f, Base64.decode(b64, Base64.DEFAULT));
                        Uri u = ArchivosProvider.uriPara(f);
                        Intent send = new Intent(Intent.ACTION_SEND);
                        send.setType(tipo);
                        send.putExtra(Intent.EXTRA_STREAM, u);
                        send.putExtra(Intent.EXTRA_SUBJECT, nombre);
                        if (texto != null && !texto.trim().isEmpty()) {
                            send.putExtra(Intent.EXTRA_TEXT, texto);
                            ClipboardManager cm = (ClipboardManager) a.getSystemService(Context.CLIPBOARD_SERVICE);
                            if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("Mensaje", texto));
                        }
                        send.setClipData(ClipData.newRawUri(nombre, u));
                        send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        a.startActivity(Intent.createChooser(send, "Compartir " + nombre));
                    } catch (Exception e) {
                        a.aviso("No se pudo compartir el archivo.");
                    }
                }
            });
        }

        /** Guarda en Descargas/Visitas PRL. Devuelve false si este Android no lo permite (antes de Android 10). */
        @JavascriptInterface
        public boolean guardar(String b64, String nombre, String tipo) {
            if (Build.VERSION.SDK_INT < 29) return false;
            try {
                ContentValues v = new ContentValues();
                v.put(MediaStore.MediaColumns.DISPLAY_NAME, limpio(nombre));
                v.put(MediaStore.MediaColumns.MIME_TYPE, tipo);
                v.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Visitas PRL");
                Uri u = a.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
                if (u == null) return false;
                OutputStream out = a.getContentResolver().openOutputStream(u);
                if (out == null) return false;
                try {
                    out.write(Base64.decode(b64, Base64.DEFAULT));
                } finally {
                    out.close();
                }
                ultimoGuardado = u;
                return true;
            } catch (Exception e) {
                return false;
            }
        }

        /** Abre con el visor del móvil el último archivo guardado con guardar() (el PDF o el Word, para revisarlo). */
        @JavascriptInterface
        public void abrirUltimo(final String tipo) {
            final Uri u = ultimoGuardado;
            if (u == null) return;
            a.runOnUiThread(new Runnable() {
                public void run() {
                    try {
                        Intent ver = new Intent(Intent.ACTION_VIEW);
                        ver.setDataAndType(u, tipo);
                        ver.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        a.startActivity(ver);
                    } catch (ActivityNotFoundException e) {
                        a.aviso("Guardado en Descargas › Visitas PRL. No hay ninguna app para abrir este archivo en este móvil.");
                    } catch (Exception e) {
                        a.aviso("Guardado en Descargas › Visitas PRL, pero no se pudo abrir.");
                    }
                }
            });
        }

        /** true si este Android deja guardar en Descargas sin pedir permisos (Android 10 o posterior). */
        @JavascriptInterface
        public boolean puedeGuardar() {
            return Build.VERSION.SDK_INT >= 29;
        }

        /**
         * Copia automática: escribe (o sobrescribe) Descargas/Visitas PRL/Copias/<nombre>.
         * Un archivo por registro; al volver a guardar el registro se actualiza el mismo archivo.
         * Los archivos de Descargas no se borran al desinstalar la app.
         */
        @JavascriptInterface
        public boolean copiaAuto(String nombre, String texto) {
            if (Build.VERSION.SDK_INT < 29 || texto == null) return false;
            try {
                String n = limpio(nombre);
                String carpeta = Environment.DIRECTORY_DOWNLOADS + "/Visitas PRL/Copias/";
                ContentResolver cr = a.getContentResolver();
                Uri col = MediaStore.Downloads.EXTERNAL_CONTENT_URI;
                Uri u = null;
                Cursor c = cr.query(col, new String[]{MediaStore.MediaColumns._ID},
                        MediaStore.MediaColumns.RELATIVE_PATH + "=? AND " + MediaStore.MediaColumns.DISPLAY_NAME + "=?",
                        new String[]{carpeta, n}, null);
                if (c != null) {
                    try {
                        if (c.moveToFirst()) u = ContentUris.withAppendedId(col, c.getLong(0));
                    } finally {
                        c.close();
                    }
                }
                if (u == null) {
                    ContentValues v = new ContentValues();
                    v.put(MediaStore.MediaColumns.DISPLAY_NAME, n);
                    v.put(MediaStore.MediaColumns.MIME_TYPE, "application/json");
                    v.put(MediaStore.MediaColumns.RELATIVE_PATH, carpeta);
                    u = cr.insert(col, v);
                    if (u == null) return false;
                }
                OutputStream out = cr.openOutputStream(u, "wt");
                if (out == null) return false;
                try {
                    out.write(texto.getBytes("UTF-8"));
                } finally {
                    out.close();
                }
                return true;
            } catch (Exception e) {
                return false;
            }
        }

        /**
         * Borra de Descargas/Visitas PRL/Copias las copias automáticas que hizo esta app y que ya no
         * están en la lista (registros borrados). Con "[]" las borra todas. Devuelve cuántas ha borrado.
         */
        @JavascriptInterface
        public int copiasLimpiar(String nombresJson) {
            if (Build.VERSION.SDK_INT < 29) return 0;
            int n = 0;
            try {
                Set<String> quedan = new HashSet<String>();
                JSONArray arr = new JSONArray(nombresJson == null ? "[]" : nombresJson);
                for (int i = 0; i < arr.length(); i++) quedan.add(limpio(arr.optString(i)));
                String carpeta = Environment.DIRECTORY_DOWNLOADS + "/Visitas PRL/Copias/";
                ContentResolver cr = a.getContentResolver();
                Uri col = MediaStore.Downloads.EXTERNAL_CONTENT_URI;
                Cursor c = cr.query(col, new String[]{MediaStore.MediaColumns._ID, MediaStore.MediaColumns.DISPLAY_NAME},
                        MediaStore.MediaColumns.RELATIVE_PATH + "=?", new String[]{carpeta}, null);
                if (c == null) return 0;
                try {
                    while (c.moveToNext()) {
                        String nombre = c.getString(1);
                        if (nombre != null && !quedan.contains(nombre)) {
                            try {
                                if (cr.delete(ContentUris.withAppendedId(col, c.getLong(0)), null, null) > 0) n++;
                            } catch (Exception e) {
                                // archivo de otra instalación: no se puede borrar sin permiso
                            }
                        }
                    }
                } finally {
                    c.close();
                }
            } catch (Exception e) {
                return n;
            }
            return n;
        }

        /** true si el móvil tiene bloqueo de pantalla (PIN, patrón, contraseña o huella). */
        @JavascriptInterface
        public boolean bloqueoDisponible() {
            return a.dispositivoSeguro();
        }

        /** Pide el desbloqueo del móvil; el resultado llega a SEG_API.resultado(ok, mensaje). */
        @JavascriptInterface
        public void desbloquear() {
            a.runOnUiThread(new Runnable() {
                public void run() {
                    a.pedirDesbloqueo();
                }
            });
        }

        /** Impide (o vuelve a permitir) las capturas de pantalla y la vista previa en apps recientes. */
        @JavascriptInterface
        public void pantallaSegura(final boolean on) {
            a.runOnUiThread(new Runnable() {
                public void run() {
                    if (on) a.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
                    else a.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
                }
            });
        }

        @JavascriptInterface
        public void copiar(final String texto) {
            a.runOnUiThread(new Runnable() {
                public void run() {
                    ClipboardManager cm = (ClipboardManager) a.getSystemService(Context.CLIPBOARD_SERVICE);
                    if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("Informe", texto));
                }
            });
        }

        /** Vibración corta al responder. patron = milisegundos separados por comas: vibra, pausa, vibra… */
        @JavascriptInterface
        public void vibrar(String patron) {
            try {
                Vibrator v = (Vibrator) a.getSystemService(Context.VIBRATOR_SERVICE);
                if (v == null || !v.hasVibrator() || patron == null) return;
                String[] p = patron.split(",");
                long[] t = new long[p.length + 1];
                for (int i = 0; i < p.length; i++) t[i + 1] = Math.max(1, Math.min(500, Long.parseLong(p[i].trim())));
                if (Build.VERSION.SDK_INT >= 26) {
                    if (t.length == 2) v.vibrate(VibrationEffect.createOneShot(t[1], VibrationEffect.DEFAULT_AMPLITUDE));
                    else v.vibrate(VibrationEffect.createWaveform(t, -1));
                } else {
                    v.vibrate(t, -1);
                }
            } catch (Exception e) {
                // sin vibración: no pasa nada
            }
        }

        @JavascriptInterface
        public String version() {
            return BuildConfigInfo.VERSION;
        }
    }

    private static String limpio(String n) {
        String s = n == null ? "archivo" : n.replaceAll("[\\\\/:*?\"<>|]", "_").trim();
        return s.isEmpty() ? "archivo" : s;
    }

    private static void escribir(File f, byte[] datos) throws IOException {
        FileOutputStream out = new FileOutputStream(f);
        try {
            out.write(datos);
        } finally {
            out.close();
        }
    }

    /** Borra fotos y archivos compartidos de hace más de un día. */
    private void limpiarCache() {
        long limite = System.currentTimeMillis() - 24L * 60 * 60 * 1000;
        for (String d : new String[]{"fotos", "compartir"}) {
            File[] fs = new File(getCacheDir(), d).listFiles();
            if (fs == null) continue;
            for (File f : fs) if (f.lastModified() < limite) f.delete();
        }
    }

    private void aviso(String t) {
        Toast.makeText(this, t, Toast.LENGTH_LONG).show();
    }

    /* ---------- botón atrás: cierra ventanas o vuelve al paso anterior ---------- */

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("(window.appBack && window.appBack()) ? 1 : 0", new ValueCallback<String>() {
            public void onReceiveValue(String v) {
                if (!"1".equals(v)) MainActivity.super.onBackPressed();
            }
        });
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }
}
