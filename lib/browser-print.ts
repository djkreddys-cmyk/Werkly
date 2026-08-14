"use client";

function createPrintFrame() {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "1px";
  frame.style.height = "1px";
  frame.style.border = "0";
  frame.style.opacity = "0";
  frame.style.pointerEvents = "none";
  return frame;
}

function schedulePrintFrameCleanup(frame: HTMLIFrameElement, printWindow: Window) {
  let cleanupTimer = 0;
  const cleanup = () => {
    window.clearTimeout(cleanupTimer);
    frame.remove();
  };

  printWindow.addEventListener("afterprint", cleanup, { once: true });
  cleanupTimer = window.setTimeout(cleanup, 60_000);
}

async function waitForImages(printWindow: Window) {
  await Promise.all(
    Array.from(printWindow.document.images).map(async (image) => {
      if (!image.complete) {
        await new Promise<void>((resolve) => {
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        });
      }

      if (typeof image.decode === "function") {
        await image.decode().catch(() => undefined);
      }
    })
  );
}

export async function printHtmlInCurrentPage(markup: string) {
  const frame = createPrintFrame();
  document.body.appendChild(frame);
  const printWindow = frame.contentWindow;
  if (!printWindow) {
    frame.remove();
    return;
  }

  printWindow.document.open();
  printWindow.document.write(markup);
  printWindow.document.close();
  await waitForImages(printWindow);
  await printWindow.document.fonts?.ready;
  schedulePrintFrameCleanup(frame, printWindow);
  printWindow.focus();
  printWindow.requestAnimationFrame(() => {
    printWindow.requestAnimationFrame(() => printWindow.print());
  });
}

export function printUrlInCurrentPage(url: string, onFinished?: () => void) {
  const frame = createPrintFrame();
  frame.addEventListener(
    "load",
    () => {
      const printWindow = frame.contentWindow;
      if (!printWindow) {
        frame.remove();
        onFinished?.();
        return;
      }

      schedulePrintFrameCleanup(frame, printWindow);
      printWindow.focus();
      printWindow.print();
      onFinished?.();
    },
    { once: true }
  );
  frame.src = url;
  document.body.appendChild(frame);
}
