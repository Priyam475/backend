package com.mercotrace.app;

import android.content.Context;
import android.os.CancellationSignal;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.dantsu.escposprinter.EscPosPrinter;
import com.dantsu.escposprinter.connection.bluetooth.BluetoothConnection;
import com.dantsu.escposprinter.connection.bluetooth.BluetoothPrintersConnections;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "MercoPrinter")
public class MercoPrinterPlugin extends Plugin {

    @PluginMethod
    public void printHtml(PluginCall call) {
        String html = call.getString("html");
        String mode = call.getString("mode", "auto"); // "system" | "thermal" | "auto"
        String deviceMac = call.getString("deviceMac", null);

        if (html == null || html.isEmpty()) {
            call.reject("html is required");
            return;
        }

        if ("system".equalsIgnoreCase(mode)) {
            printSystem(html, call);
            return;
        }

        if ("thermal".equalsIgnoreCase(mode)) {
            boolean ok = tryThermalByMac(html, deviceMac);
            if (ok) {
                JSObject ret = new JSObject();
                ret.put("ok", true);
                ret.put("printedMode", "thermal");
                call.resolve(ret);
            } else {
                call.reject("Thermal printing failed or MAC not found");
            }
            return;
        }

        // auto: try thermal with bound MAC (if present). If it fails, always fall back to system.
        boolean thermalOk = tryThermalByMac(html, deviceMac);
        if (thermalOk) {
            JSObject ret = new JSObject();
            ret.put("ok", true);
            ret.put("printedMode", "thermal");
            call.resolve(ret);
        } else {
            printSystem(html, call);
        }
    }

    @PluginMethod
    public void listPrinters(PluginCall call) {
        Context context = getContext();
        if (context == null) {
            call.reject("Context not available");
            return;
        }

        try {
            BluetoothPrintersConnections printers = new BluetoothPrintersConnections(context);
            BluetoothConnection[] available = printers.getList();

            List<JSObject> printerList = new ArrayList<>();
            if (available != null) {
                for (BluetoothConnection conn : available) {
                    if (conn == null || conn.getDevice() == null) continue;
                    String mac = conn.getDevice().getAddress();
                    String name = conn.getDevice().getName();

                    JSObject item = new JSObject();
                    item.put("mac", mac);
                    item.put("name", name != null ? name : mac);
                    printerList.add(item);
                }
            }

            JSObject ret = new JSObject();
            ret.put("printers", printerList);
            call.resolve(ret);
        } catch (Exception e) {
            // If permissions are missing, this will usually throw. Let UI show a helpful message.
            call.reject("Failed to list Bluetooth printers: " + e.getMessage(), e);
        }
    }

    private void printSystem(String html, PluginCall call) {
        Context context = getContext();
        if (context == null) {
            call.reject("No context");
            return;
        }

        PrintManager printManager = (PrintManager) context.getSystemService(Context.PRINT_SERVICE);
        if (printManager == null) {
            call.reject("Print service not available");
            return;
        }

        WebView webView = new WebView(context);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                PrintDocumentAdapter adapter = new PrintDocumentAdapter() {
                    private final PrintDocumentAdapter innerAdapter =
                        webView.createPrintDocumentAdapter("MercotraceDocument");

                    @Override
                    public void onLayout(
                        android.print.PrintAttributes oldAttributes,
                        android.print.PrintAttributes newAttributes,
                        CancellationSignal cancellationSignal,
                        LayoutResultCallback callback,
                        android.os.Bundle extras
                    ) {
                        innerAdapter.onLayout(oldAttributes, newAttributes, cancellationSignal, callback, extras);
                    }

                    @Override
                    public void onWrite(
                        PageRange[] pages,
                        android.os.ParcelFileDescriptor destination,
                        CancellationSignal cancellationSignal,
                        WriteResultCallback callback
                    ) {
                        innerAdapter.onWrite(pages, destination, cancellationSignal, callback);
                    }

                    @Override
                    public void onFinish() {
                        super.onFinish();
                        webView.destroy();
                    }
                };

                PrintAttributes attributes = new PrintAttributes.Builder()
                    .setColorMode(PrintAttributes.COLOR_MODE_COLOR)
                    .build();

                // This triggers Android's system print picker (and "Save as PDF" option).
                printManager.print("MercotraceJob", adapter, attributes);

                JSObject ret = new JSObject();
                ret.put("ok", true);
                ret.put("printedMode", "system");
                call.resolve(ret);
            }
        });

        webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
    }

    private boolean tryThermalByMac(String html, String deviceMac) {
        if (deviceMac == null || deviceMac.trim().isEmpty()) {
            return false;
        }

        Context context = getContext();
        if (context == null) return false;

        try {
            BluetoothPrintersConnections printers = new BluetoothPrintersConnections(context);
            BluetoothConnection[] available = printers.getList();

            if (available == null || available.length == 0) return false;

            BluetoothConnection matched = null;
            for (BluetoothConnection conn : available) {
                if (conn == null || conn.getDevice() == null) continue;
                String mac = conn.getDevice().getAddress();
                if (mac != null && mac.equalsIgnoreCase(deviceMac.trim())) {
                    matched = conn;
                    break;
                }
            }

            if (matched == null) return false;

            // 80mm thermal paper width (per your requirement).
            // 203 DPI + 80mm => typically ~48 chars per line.
            EscPosPrinter printer = new EscPosPrinter(matched, 203, 80f, 48);
            String text = htmlToPlainText(html);
            if (text.isEmpty()) {
                text = "Mercotrace\nPrint job\n";
            }
            printer.printFormattedText(text);
            printer.disconnectPrinter();
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private String htmlToPlainText(String html) {
        if (html == null) return "";
        String text = html
            .replaceAll("(?i)<br\\s*/?>", "\n")
            .replaceAll("(?i)</p>", "\n\n")
            .replaceAll("(?s)<[^>]*>", "")
            .replace("&nbsp;", " ");
        return text.trim();
    }
}

