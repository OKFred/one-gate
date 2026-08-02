export const GET_APPS_DETAILS_SCRIPT = `
var pm = context.getPackageManager();
var packages = pm.getInstalledPackages(0);
var appList = [];
for (var i = 0; i < packages.size(); i++) {
    var packageInfo = packages.get(i);
    var appName = packageInfo.applicationInfo.loadLabel(pm).toString();
    var packageName = packageInfo.packageName;
    var versionName = packageInfo.versionName || "";
    var isSystem = (packageInfo.applicationInfo.flags & android.content.pm.ApplicationInfo.FLAG_SYSTEM) !== 0;
    
    var iconBase64 = null;
    try {
        var drawable = packageInfo.applicationInfo.loadIcon(pm);
        var bitmap;
        if (drawable instanceof android.graphics.drawable.BitmapDrawable) {
            bitmap = drawable.getBitmap();
        } else {
            var width = drawable.getIntrinsicWidth();
            var height = drawable.getIntrinsicHeight();
            if (width <= 0) width = 96;
            if (height <= 0) height = 96;
            bitmap = android.graphics.Bitmap.createBitmap(width, height, android.graphics.Bitmap.Config.ARGB_8888);
            var canvas = new android.graphics.Canvas(bitmap);
            drawable.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
            drawable.draw(canvas);
        }
        var scaledBitmap = android.graphics.Bitmap.createScaledBitmap(bitmap, 48, 48, true);
        var baos = new java.io.ByteArrayOutputStream();
        scaledBitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 70, baos);
        iconBase64 = "data:image/jpeg;base64," + android.util.Base64.encodeToString(baos.toByteArray(), android.util.Base64.NO_WRAP);
    } catch(e) {
        // ignore icon error
    }

    appList.push({
        name: appName,
        packageName: packageName,
        version: versionName,
        isSystem: isSystem,
        iconBase64: iconBase64
    });
}
taskResult = JSON.stringify(appList);
`;

export const EXECUTE_UPDATE_DOWNLOAD_SCRIPT = `
var downloadUrl = "{{downloadUrl}}";
var targetPath = "/sdcard/Download/update_temp.apk";

// 辅助方法：向 PC 发送实时进度
function reportProgress(msg) {
    console.log(msg);
    if (typeof callbackUrl !== 'undefined') {
        try {
            http.postJson(callbackUrl, {
                taskId: typeof taskId !== 'undefined' ? taskId : 'unknown',
                status: 'PROGRESS',
                message: msg
            });
        } catch (e) {}
    }
}

reportProgress("开始下载 APK: " + downloadUrl);
var urlObj = new java.net.URL(downloadUrl);
var conn = urlObj.openConnection();
conn.connect();
var totalBytes = conn.getContentLength();
var input = conn.getInputStream();
var output = new java.io.FileOutputStream(targetPath);
var buffer = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 4096);
var len;
var downloadedBytes = 0;
var lastReported = 0;
var lastReportTime = Date.now();

while ((len = input.read(buffer)) !== -1) {
    output.write(buffer, 0, len);
    downloadedBytes += len;
    
    var now = Date.now();
    // 每下载至少 5% 且距离上次汇报超过 2 秒，才上报进度
    if (totalBytes > 0 && downloadedBytes - lastReported >= totalBytes * 0.05 && (now - lastReportTime > 2000)) {
        lastReported = downloadedBytes;
        lastReportTime = now;
        var percent = Math.floor((downloadedBytes / totalBytes) * 100);
        reportProgress("下载进度: " + percent + "% (" + (downloadedBytes/1024/1024).toFixed(1) + "MB / " + (totalBytes/1024/1024).toFixed(1) + "MB)");
    }
}
output.flush();
output.close();
input.close();
reportProgress("APK 下载完成. 保存路径: " + targetPath);

// 尝试静默安装 (Root)
reportProgress("正在静默安装 APK (绕过 SELinux 限制)...");
var tmpPath = "/data/local/tmp/update_temp.apk";
// 将文件复制到 /data/local/tmp 以防 pm install 无权读取 /sdcard (SELinux 拒绝)
shell("cp '" + targetPath + "' '" + tmpPath + "' && chmod 777 '" + tmpPath + "'", true);
var result = shell("pm install -r '" + tmpPath + "'", true);
shell("rm -f '" + tmpPath + "'", true);

if (result.code === 0) {
    taskResult = "更新成功！静默安装完成。";
} else {
    reportProgress("静默安装失败 (" + result.error + ")，转为手动安装模式...");
    app.viewFile(targetPath);
    taskResult = "已唤起安装界面，请手动完成安装。";
}
`;
