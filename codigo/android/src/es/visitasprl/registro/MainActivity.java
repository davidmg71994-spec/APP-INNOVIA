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
import android.content.SharedPreferences;
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
import android.provider.DocumentsContract;
import android.os.ParcelFileDescriptor;
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
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
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
 *
 * Sincronizar con OneDrive (1.21.0): sin red propia. El técnico crea su archivo en OneDrive y elige el del
 * ordenador con el selector del sistema (Storage Access Framework); la app guarda el permiso permanente y
 * escribe y lee esos archivos en segundo plano. La subida y la bajada las hace la app de OneDrive.
 */
public class MainActivity extends Activity {

    static final String HOST = "app.visitasprl.local";
    static final String START = "https://" + HOST + "/index.html";
    static final int REQ_ARCHIVO = 1;
    static final int REQ_DESBLOQUEO = 2;
    static final int REQ_SYNC_PROPIO = 3;
    static final int REQ_SYNC_OTROS = 4;
    static final String SYNC = "sincro";

    private WebView web;
    private ValueCallback<Uri[]> archivoCallback;
    private Uri fotoUri;
    private long paradaMs = 0;
    private volatile String[] syncTextos;
    private final Object syncLock = new Object();

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
        if (web != null) web.evaluateJavascript("window.SYNC_API&&SYNC_API.alSalir()", null);
    }

    @Override
    protected void onStart() {
        super.onStart();
        if (paradaMs > 0 && web != null) {
            long fuera = SystemClock.elapsedRealtime() - paradaMs;
            paradaMs = 0;
            web.evaluateJavascript("window.SEG_API&&SEG_API.vuelve(" + fuera + ")", null);
            web.evaluateJavascript("window.SYNC_API&&SYNC_API.alVolver()", null);
        }
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req == REQ_DESBLOQUEO) {
            resultadoDesbloqueo(res == RESULT_OK, res == RESULT_OK ? "" : "No se ha desbloqueado");
            return;
        }
        if (req == REQ_SYNC_PROPIO || req == REQ_SYNC_OTROS) {
            syncResultado(req, res, data);
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

    /* ---------- sincronizar con OneDrive (Storage Access Framework) ---------- */

    private SharedPreferences syncPrefs() {
        return getSharedPreferences(SYNC, MODE_PRIVATE);
    }

    private void js(final String codigo) {
        runOnUiThread(new Runnable() {
            public void run() {
                if (web != null) web.evaluateJavascript(codigo, null);
            }
        });
    }

    private void syncAviso(String k, boolean ok, String info) {
        js("window.SYNC_API&&SYNC_API.nativo(" + JSONObject.quote(k) + "," + ok + "," + JSONObject.quote(info == null ? "" : info) + ")");
    }

    void syncElegirPropio(String nombre) {
        try {
            Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            i.addCategory(Intent.CATEGORY_OPENABLE);
            i.setType("application/json");
            i.putExtra(Intent.EXTRA_TITLE, limpio(nombre));
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
            startActivityForResult(i, REQ_SYNC_PROPIO);
        } catch (ActivityNotFoundException e) {
            syncAviso("propio", false, "No hay selector de archivos");
        }
    }

    void syncElegirOtros() {
        try {
            Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            i.addCategory(Intent.CATEGORY_OPENABLE);
            i.setType("*/*");
            i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
            startActivityForResult(i, REQ_SYNC_OTROS);
        } catch (ActivityNotFoundException e) {
            syncAviso("otros", false, "No hay selector de archivos");
        }
    }

    private void syncResultado(int req, int res, Intent data) {
        String k = req == REQ_SYNC_PROPIO ? "propio" : "otros";
        if (res != RESULT_OK || data == null) { syncAviso(k, false, ""); return; }
        List<Uri> us = new ArrayList<Uri>();
        ClipData c = data.getClipData();
        if (c != null) for (int i = 0; i < c.getItemCount(); i++) us.add(c.getItemAt(i).getUri());
        else if (data.getData() != null) us.add(data.getData());
        if (us.isEmpty()) { syncAviso(k, false, ""); return; }
        int fl = data.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        ContentResolver cr = getContentResolver();
        SharedPreferences p = syncPrefs();
        SharedPreferences.Editor e = p.edit();
        JSONArray nombres = new JSONArray();
        if (req == REQ_SYNC_PROPIO) {
            soltarPermiso(p.getString("propio", null));
            Uri u = us.get(0);
            /* permiso permanente de lectura y escritura (si el proveedor no da los dos, al menos lo que dé) */
            try {
                cr.takePersistableUriPermission(u, Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            } catch (Exception x) {
                try { cr.takePersistableUriPermission(u, fl); } catch (Exception y) { /* sin permiso permanente: valdrá mientras la app esté abierta */ }
            }
            e.putString("propio", u.toString());
            e.putString("propioNombre", nombreDe(u));
            nombres.put(nombreDe(u));
        } else {
            try {
                JSONArray viejos = new JSONArray(p.getString("otros", "[]"));
                for (int i = 0; i < viejos.length(); i++) soltarPermiso(viejos.optString(i));
            } catch (Exception x) { /* nada */ }
            JSONArray l = new JSONArray();
            for (Uri u : us) {
                try { cr.takePersistableUriPermission(u, fl & Intent.FLAG_GRANT_READ_URI_PERMISSION); } catch (Exception x) { /* sin permiso permanente */ }
                l.put(u.toString());
                nombres.put(nombreDe(u));
            }
            e.putString("otros", l.toString());
        }
        e.apply();
        syncAviso(k, true, nombres.toString());
    }

    private void soltarPermiso(String uri) {
        if (uri == null || uri.isEmpty()) return;
        try {
            getContentResolver().releasePersistableUriPermission(Uri.parse(uri), Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        } catch (Exception e) { /* ya no estaba */ }
        try {
            getContentResolver().releasePersistableUriPermission(Uri.parse(uri), Intent.FLAG_GRANT_READ_URI_PERMISSION);
        } catch (Exception e) { /* ya no estaba */ }
    }

    /** Nombre, fecha de modificación y tamaño del documento (lo que diga el proveedor, p. ej. OneDrive). */
    private String nombreDe(Uri u) {
        String[] m = meta(u);
        return m[0] != null ? m[0] : u.getLastPathSegment();
    }

    private String[] meta(Uri u) {
        String[] r = new String[3];
        Cursor c = null;
        try {
            c = getContentResolver().query(u, new String[]{DocumentsContract.Document.COLUMN_DISPLAY_NAME, DocumentsContract.Document.COLUMN_LAST_MODIFIED, DocumentsContract.Document.COLUMN_SIZE}, null, null, null);
            if (c != null && c.moveToFirst()) {
                if (!c.isNull(0)) r[0] = c.getString(0);
                if (!c.isNull(1)) r[1] = String.valueOf(c.getLong(1));
                if (!c.isNull(2)) r[2] = String.valueOf(c.getLong(2));
            }
        } catch (Exception e) {
            // sin datos del proveedor
        } finally {
            if (c != null) c.close();
        }
        return r;
    }

    /** Escribe el archivo de este móvil en OneDrive. Devuelve null si ha ido bien, o el error. */
    String syncEscribir(String texto) {
        synchronized (syncLock) {
            String s = syncPrefs().getString("propio", null);
            if (s == null) return "Falta elegir dónde guardar el archivo de este móvil";
            Uri u = Uri.parse(s);
            byte[] datos;
            try { datos = texto.getBytes("UTF-8"); } catch (Exception e) { return "Texto no válido"; }
            String ultimo = null;
            boolean permiso = false;
            for (String modo : new String[]{"wt", "rwt", "w"}) {
                OutputStream out = null;
                try {
                    out = getContentResolver().openOutputStream(u, modo);
                    if (out == null) throw new IOException("sin salida");
                    out.write(datos);
                    out.flush();
                    out.close();
                    out = null;
                    return null;
                } catch (SecurityException e) {
                    permiso = true;
                    ultimo = e.getMessage();
                } catch (Exception e) {
                    ultimo = e.getMessage();
                } finally {
                    if (out != null) try { out.close(); } catch (IOException x) { /* nada */ }
                }
            }
            /* último intento: descriptor de archivo, recortado a cero */
            ParcelFileDescriptor pfd = null;
            try {
                pfd = getContentResolver().openFileDescriptor(u, "rw");
                if (pfd != null) {
                    FileOutputStream fo = new FileOutputStream(pfd.getFileDescriptor());
                    fo.getChannel().truncate(0);
                    fo.getChannel().position(0);
                    fo.write(datos);
                    fo.flush();
                    fo.close();
                    return null;
                }
            } catch (SecurityException e) {
                permiso = true;
            } catch (Exception e) {
                if (ultimo == null) ultimo = e.getMessage();
            } finally {
                if (pfd != null) try { pfd.close(); } catch (IOException x) { /* nada */ }
            }
            if (permiso) return "Sin permiso para escribir el archivo de este móvil: pulsa «Desactivar», vuelve a activarlo y elige otra vez dónde guardar";
            return "No se pudo escribir el archivo de este móvil" + (ultimo != null ? " (" + ultimo + ")" : "");
        }
    }

    /** Lee los archivos de los otros dispositivos; el texto se queda en memoria hasta que la página lo recoge. */
    String syncLeer() {
        synchronized (syncLock) {
            JSONArray meta = new JSONArray();
            List<String> textos = new ArrayList<String>();
            try {
                JSONArray l = new JSONArray(syncPrefs().getString("otros", "[]"));
                for (int i = 0; i < l.length(); i++) {
                    Uri u = Uri.parse(l.getString(i));
                    JSONObject o = new JSONObject();
                    String[] m = meta(u);
                    o.put("nombre", m[0] != null ? m[0] : u.getLastPathSegment());
                    if (m[1] != null) o.put("mod", Long.parseLong(m[1]));
                    if (m[2] != null) o.put("tam", Long.parseLong(m[2]));
                    InputStream in = null;
                    try {
                        in = getContentResolver().openInputStream(u);
                        if (in == null) throw new IOException("sin datos");
                        ByteArrayOutputStream b = new ByteArrayOutputStream();
                        byte[] buf = new byte[65536];
                        int n;
                        while ((n = in.read(buf)) > 0) b.write(buf, 0, n);
                        textos.add(b.toString("UTF-8"));
                        o.put("ok", true);
                    } catch (SecurityException e) {
                        textos.add(null);
                        o.put("ok", false);
                        o.put("error", "sin permiso: vuelve a elegir el archivo del ordenador");
                    } catch (Exception e) {
                        textos.add(null);
                        o.put("ok", false);
                        o.put("error", "no se pudo leer (¿sin conexión?)");
                    } finally {
                        if (in != null) try { in.close(); } catch (IOException x) { /* nada */ }
                    }
                    meta.put(o);
                }
            } catch (Exception e) {
                // lista vacía
            }
            syncTextos = textos.toArray(new String[0]);
            return meta.toString();
        }
    }

    String syncEstado() {
        try {
            SharedPreferences p = syncPrefs();
            JSONObject o = new JSONObject();
            String pu = p.getString("propio", null);
            if (pu != null) {
                o.put("propio", p.getString("propioNombre", ""));
                boolean ok = false;
                for (android.content.UriPermission up : getContentResolver().getPersistedUriPermissions())
                    if (up.getUri().toString().equals(pu) && up.isWritePermission()) ok = true;
                o.put("propioOk", ok);
            }
            JSONArray l = new JSONArray(p.getString("otros", "[]")), n = new JSONArray();
            for (int i = 0; i < l.length(); i++) n.put(Uri.parse(l.getString(i)).getLastPathSegment());
            o.put("otros", n);
            return o.toString();
        } catch (Exception e) {
            return "{}";
        }
    }

    void syncQuitar() {
        SharedPreferences p = syncPrefs();
        soltarPermiso(p.getString("propio", null));
        try {
            JSONArray l = new JSONArray(p.getString("otros", "[]"));
            for (int i = 0; i < l.length(); i++) soltarPermiso(l.optString(i));
        } catch (Exception e) { /* nada */ }
        p.edit().clear().apply();
        syncTextos = null;
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

        /* --- sincronizar con OneDrive: las respuestas llegan a SYNC_API.nativo(tipo, ok, info) --- */
        @JavascriptInterface
        public void syncElegirPropio(final String nombre) {
            a.runOnUiThread(new Runnable() {
                public void run() {
                    a.syncElegirPropio(nombre);
                }
            });
        }

        @JavascriptInterface
        public void syncElegirOtros() {
            a.runOnUiThread(new Runnable() {
                public void run() {
                    a.syncElegirOtros();
                }
            });
        }

        @JavascriptInterface
        public void syncEscribir(final String texto) {
            new Thread(new Runnable() {
                public void run() {
                    String err = a.syncEscribir(texto);
                    a.syncAviso("escrito", err == null, err);
                }
            }).start();
        }

        @JavascriptInterface
        public void syncLeer() {
            new Thread(new Runnable() {
                public void run() {
                    String meta = a.syncLeer();
                    a.syncAviso("leido", true, meta);
                }
            }).start();
        }

        @JavascriptInterface
        public String syncTexto(int i) {
            String[] t = a.syncTextos;
            return t != null && i >= 0 && i < t.length ? t[i] : null;
        }

        @JavascriptInterface
        public void syncSoltar() {
            a.syncTextos = null;
        }

        @JavascriptInterface
        public String syncEstado() {
            return a.syncEstado();
        }

        @JavascriptInterface
        public void syncQuitar() {
            a.syncQuitar();
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
