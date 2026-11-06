package es.visitasprl.registro;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;

import java.io.File;
import java.io.FileNotFoundException;
import java.util.List;

/**
 * Da acceso temporal a dos carpetas de la caché de la app:
 *  - fotos: donde la cámara guarda la foto que se acaba de hacer
 *  - compartir: PDF y copias de seguridad que se envían por WhatsApp, correo, etc.
 */
public class ArchivosProvider extends ContentProvider {

    static final String AUTORIDAD = "es.visitasprl.registro.archivos";

    static Uri uriPara(File f) {
        return new Uri.Builder().scheme("content").authority(AUTORIDAD)
                .appendPath(f.getParentFile().getName()).appendPath(f.getName()).build();
    }

    private File archivo(Uri u) throws FileNotFoundException {
        List<String> seg = u.getPathSegments();
        if (seg.size() != 2) throw new FileNotFoundException(u.toString());
        String dir = seg.get(0), nombre = seg.get(1);
        if (!("fotos".equals(dir) || "compartir".equals(dir)) || nombre.contains("/") || nombre.contains(".."))
            throw new FileNotFoundException(u.toString());
        return new File(new File(getContext().getCacheDir(), dir), nombre);
    }

    @Override
    public boolean onCreate() {
        return true;
    }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        File f = archivo(uri);
        int m = ParcelFileDescriptor.parseMode(mode);
        if ((m & ParcelFileDescriptor.MODE_WRITE_ONLY) != 0 || (m & ParcelFileDescriptor.MODE_READ_WRITE) != 0) {
            m |= ParcelFileDescriptor.MODE_CREATE;
            File p = f.getParentFile();
            if (p != null) p.mkdirs();
        }
        return ParcelFileDescriptor.open(f, m);
    }

    @Override
    public String getType(Uri uri) {
        String n = uri.getLastPathSegment();
        if (n == null) return "application/octet-stream";
        n = n.toLowerCase();
        if (n.endsWith(".pdf")) return "application/pdf";
        if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
        if (n.endsWith(".png")) return "image/png";
        if (n.endsWith(".json")) return "application/json";
        return "application/octet-stream";
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection, String[] args, String sort) {
        File f;
        try {
            f = archivo(uri);
        } catch (FileNotFoundException e) {
            return null;
        }
        String[] cols = projection != null ? projection : new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE};
        MatrixCursor c = new MatrixCursor(cols, 1);
        Object[] fila = new Object[cols.length];
        for (int i = 0; i < cols.length; i++) {
            if (OpenableColumns.DISPLAY_NAME.equals(cols[i])) fila[i] = f.getName();
            else if (OpenableColumns.SIZE.equals(cols[i])) fila[i] = f.length();
        }
        c.addRow(fila);
        return c;
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) {
        return null;
    }

    @Override
    public int delete(Uri uri, String selection, String[] args) {
        return 0;
    }

    @Override
    public int update(Uri uri, ContentValues values, String selection, String[] args) {
        return 0;
    }
}
