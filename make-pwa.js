/* Build the iPad-installable PWA copy of Calder Studio.
 *
 * The built "Calder Studio Standalone.html" is a self-unpacking loader: the real
 * app (its <head> included) is stored as an escaped string in the payload and
 * REPLACES the loader DOM at boot. So the PWA tags that iOS reads at "Add to Home
 * Screen" time (manifest, apple-* meta, viewport) must live in the PAYLOAD head,
 * and the service-worker registration goes in the LOADER (runs first, registers
 * at the origin, survives the DOM swap).
 *
 * This transforms only the PWA COPY (pwa/index.html); src/ and the desktop build
 * are left completely untouched. Run from the repo root:  node pwa/make-pwa.js
 */
var fs = require("fs");
var path = require("path");

var ROOT = path.resolve(__dirname, "..");
var SRC = path.join(ROOT, "Calder Studio Standalone.html");
var OUT = path.join(__dirname, "index.html");
var Q = '\\"';   // the bytes backslash-quote, i.e. a double-quote as it appears inside the escaped payload

var build = (fs.readFileSync(path.join(ROOT, "src", "js", "app.js"), "utf8").match(/__csBuild\s*=\s*"([^"]+)"/) || [])[1] || "dev";
var html = fs.readFileSync(SRC, "utf8");
function must(before, after, label) {
  if (html.indexOf(before) < 0) throw new Error("PWA inject anchor not found: " + label);
  html = html.replace(before, after);
}

/* 1) PAYLOAD: relax the CSP just enough for a same-origin manifest + service worker */
must("default-src 'none'; script-src",
     "default-src 'none'; manifest-src 'self'; worker-src 'self'; script-src",
     "csp");

/* 2) PAYLOAD: viewport - keep width/scale, add viewport-fit + lock user zoom so the
      app's own canvas zoom owns pinch, not Safari */
must("<meta name=" + Q + "viewport" + Q + " content=" + Q + "width=device-width, initial-scale=1.0" + Q + ">",
     "<meta name=" + Q + "viewport" + Q + " content=" + Q + "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" + Q + ">",
     "viewport");

/* 3) PAYLOAD: manifest + iOS home-screen meta + the existing logo, right after the CSP meta */
var tags = ""
  + " <link rel=" + Q + "manifest" + Q + " href=" + Q + "manifest.json" + Q + ">"
  + " <meta name=" + Q + "theme-color" + Q + " content=" + Q + "#0c0c0e" + Q + ">"
  + " <meta name=" + Q + "mobile-web-app-capable" + Q + " content=" + Q + "yes" + Q + ">"
  + " <meta name=" + Q + "apple-mobile-web-app-capable" + Q + " content=" + Q + "yes" + Q + ">"
  + " <meta name=" + Q + "apple-mobile-web-app-status-bar-style" + Q + " content=" + Q + "black-translucent" + Q + ">"
  + " <meta name=" + Q + "apple-mobile-web-app-title" + Q + " content=" + Q + "Calder Studio" + Q + ">"
  + " <link rel=" + Q + "apple-touch-icon" + Q + " href=" + Q + "apple-touch-icon.png" + Q + ">"
  + " <link rel=" + Q + "icon" + Q + " href=" + Q + "icon.png" + Q + ">";
must("font-src 'self' data:;" + Q + ">",
     "font-src 'self' data:;" + Q + ">" + tags,
     "head-tags");

/* 4) LOADER: register the service worker (runs before the DOM swap; origin-scoped) */
var sw = '<script>if("serviceWorker" in navigator){addEventListener("load",function(){navigator.serviceWorker.register("sw.js").catch(function(){});});}</script>';
must("<title>Calder Studio</title>",
     "<title>Calder Studio</title>" + sw,
     "loader-title");

fs.writeFileSync(OUT, html);

/* stamp the build id into the service-worker cache name so a new build refreshes it */
var swPath = path.join(__dirname, "sw.js");
fs.writeFileSync(swPath, fs.readFileSync(swPath, "utf8").replace(/celstudio-[A-Za-z0-9_]+/g, "celstudio-" + build));

console.log("PWA built: pwa/index.html  (build " + build + ", cache celstudio-" + build + ")");
