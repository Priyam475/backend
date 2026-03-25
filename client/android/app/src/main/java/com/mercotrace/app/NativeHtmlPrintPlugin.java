package com.mercotrace.app;

import android.app.Activity;
import android.content.Context;
import android.graphics.Color;
import android.os.Handler;
import android.os.Looper;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeHtmlPrint")
public class NativeHtmlPrintPlugin extends Plugin {

  @PluginMethod
  public void printHtml(PluginCall call) {
    String html = call.getString("html");
    String jobName = call.getString("jobName", "MercoPrint");

    if (html == null || html.trim().isEmpty()) {
      call.reject("Missing required field: html");
      return;
    }

    Activity activity = getActivity();
    if (activity == null) {
      call.reject("Activity is not available");
      return;
    }

    // Capacitor plugin method can be invoked off the UI thread. Ensure WebView/PrintManager
    // interactions run on the main thread.
    activity.runOnUiThread(() -> {
      final boolean[] settled = new boolean[] { false };

      final ViewGroup root = activity.findViewById(android.R.id.content);
      final FrameLayout container = new FrameLayout(activity);
      container.setBackgroundColor(Color.TRANSPARENT);

      // Keep the WebView attached with a *real* size so Android can render it into
      // the PrintDocumentAdapter. (1x1 can lead to blank/failed print outputs.)
      final FrameLayout.LayoutParams containerLp = new FrameLayout.LayoutParams(800, 600);
      container.setVisibility(View.VISIBLE);
      container.setAlpha(0f); // invisible but still layout-sized
      container.setX(-10000f);
      container.setY(-10000f);
      root.addView(container, containerLp);

      final WebView webView = new WebView(activity);
      webView.setBackgroundColor(Color.TRANSPARENT);

      webView.getSettings().setJavaScriptEnabled(false);
      webView.getSettings().setDomStorageEnabled(true);

      webView.setWebViewClient(new WebViewClient() {
        @Override
        public void onPageFinished(WebView view, String url) {
          if (settled[0]) return;
          settled[0] = true;

          PrintManager printManager = (PrintManager) activity.getSystemService(Context.PRINT_SERVICE);
          if (printManager == null) {
            call.reject("PrintManager not available");
            cleanup(root, container);
            return;
          }

          PrintDocumentAdapter adapter = view.createPrintDocumentAdapter(jobName);
          PrintAttributes attrs = new PrintAttributes.Builder().build();
          printManager.print(jobName, adapter, attrs);

          call.resolve(new JSObject());
          // Remove the offscreen WebView after the adapter has been created.
          cleanupWithDelay(root, container, 1500);
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
          // If this fires, printing won't work. Keep it simple and reject.
          if (settled[0]) return;
          settled[0] = true;

          call.reject("Failed to load HTML for printing");
          cleanup(root, container);
        }
      });

      container.addView(webView, new FrameLayout.LayoutParams(800, 600));
      webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);

      // Safety timeout in case onPageFinished never fires for some WebView implementations.
      new Handler(Looper.getMainLooper()).postDelayed(() -> {
        if (settled[0]) return;
        settled[0] = true;
        call.reject("Printing timed out");
        cleanup(root, container);
      }, 10000);
    });
  }

  private static void cleanup(ViewGroup root, FrameLayout container) {
    try {
      root.removeView(container);
    } catch (Exception ignored) {
      // ignore
    }
  }

  private static void cleanupWithDelay(ViewGroup root, FrameLayout container, long delayMs) {
    new Handler(Looper.getMainLooper()).postDelayed(() -> cleanup(root, container), delayMs);
  }
}

