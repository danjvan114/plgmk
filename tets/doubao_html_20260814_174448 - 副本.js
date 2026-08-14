//<script src="https://cdn.jsdelivr.net/npm/crypto-js@4.2.0/crypto-js.min.js"></script>
//<script>
(function() {
    // 固定AES参数（和你的在线工具完全一致 Text模式）
    const Sb="JkrVe";//1
    const Mz="awa";
    const Yt="ZuLe";
    const Kz="#7U";
    const usb="#TuJ";//2
    const zzl="TT";
    const mcNB="miniWorld";
    const auth="qwq";
    const github="https://github.com/danjvan114";
    const Sbk="YREZ";//3
    const netPlaceholder="114514";
    const jb="yourJB is big";
    const DJB="XCR";//4
    const bigJB="4a5e6f6e"; 
    const Minecraft0 = "JkrVeawaZuLe#7U#TuJTTminiWorldqwq";
    const IV_RAW  = "DZ9L3^dwZEo%wadu";
    const aesIv  = CryptoJS.enc.Utf8.parse(IV_RAW);
    const Minecraft = Sb + usb + Sbk + DJB;
    const net = CryptoJS.enc.Utf8.parse(Minecraft);

    // 创建全局命名空间
    window.keauth = {};
    
    /**
     * 作品鉴权加密
     * @param {string} workText 作品原始明文
     * @param {string} authChar 鉴权字符
     * @returns {string} AES‑CBC base64密文
     */
    window.keauth.encrypt = function(workText, authChar) {
        const rawPayload = authChar + "+" + workText;
        const cipherObj = CryptoJS.AES.encrypt(rawPayload, net, {
            iv: aesIv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
        return cipherObj.toString();
    };

    /**
     * 解密并鉴权校验
     * @param {string} cipherBase64 AES base64密文
     * @param {string} expectAuth 期望鉴权字符
     * @returns {string} 返回作品明文（+后面部分）
     * @throws {Error} 解密失败 / 无+分隔符 / 鉴权不匹配
     */
    window.keauth.decrypt = function(cipherBase64, expectAuth) {
        const decObj = CryptoJS.AES.decrypt(cipherBase64, net, {
            iv: aesIv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
        const decrypted = decObj.toString(CryptoJS.enc.Utf8);
        if (!decrypted) throw new Error("AES解密失败");

        const plusPos = decrypted.indexOf("+");
        if (plusPos === -1) throw new Error("未找到鉴权分隔符 +");

        const realAuth = decrypted.substring(0, plusPos);
        const workContent = decrypted.substring(plusPos + 1);

        if (realAuth !== expectAuth) {
            throw new Error(`鉴权校验失败，收到：${realAuth}，期望：${expectAuth}`);
        }
        return workContent;
    };
})();

// ============ 测试示例 ============