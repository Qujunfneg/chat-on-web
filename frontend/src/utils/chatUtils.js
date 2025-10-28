// 图片压缩函数
export const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // 计算压缩后的尺寸（保持宽高比）
        const MAX_WIDTH = 1000;
        const MAX_HEIGHT = 1000;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // 根据文件类型设置quality（JPEG和WebP支持quality参数）
        const isJpeg = file.type === "image/jpeg";
        const isWebp = file.type === "image/webp";
        const quality = isJpeg || isWebp ? 0.7 : 0.92; // 压缩质量

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Canvas to Blob conversion failed"));
              return;
            }

            const compressedReader = new FileReader();
            compressedReader.onload = (e) => {
              resolve(e.target.result);
            };
            compressedReader.readAsDataURL(blob);
          },
          file.type,
          quality
        );
      };
      img.onerror = () => reject(new Error("Image loading failed"));
      img.src = event.target.result;
    };
    reader.onerror = () => reject(new Error("File reading failed"));
    reader.readAsDataURL(file);
  });
};

// 将DataURL转换为File对象
export const dataURItoFile = (dataURI, filename) => {
  const byteString = atob(dataURI.split(",")[1]);
  const mimeString = dataURI.split(",")[0].split(":")[1].split(";"[0]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);

  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  return new File([ab], filename, { type: mimeString });
};

// 检查是否为图片URL
export const isImageUrl = (url) => {
  if (typeof url !== "string") return false;
  return url.match(/\.(jpeg|jpg|gif|png|webp)$/) != null;
};

// 生成头像颜色
export const getAvatarColor = (username) => {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DDA0DD",
    "#98D8C8",
    "#F7DC6F",
  ];
  return colors[Math.abs(hash) % colors.length];
};

// 获取头像文字
export const getAvatarText = (username) => {
  if (!username) {
    return "?";
  }
  return username.charAt(0).toUpperCase();
};