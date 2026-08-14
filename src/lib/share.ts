import { domToPng } from "modern-screenshot";

/** 把 DOM 节点导出为高清 PNG 并触发下载（2x 像素，手机可直接分享） */
export async function downloadNodeAsPng(
  node: HTMLElement,
  filename: string,
): Promise<void> {
  const dataUrl = await domToPng(node, {
    scale: 2,
    backgroundColor: "#080a12",
    quality: 1,
    font: false, // 跳过字体嵌入，中文走系统字体，避免卡顿
  });
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
