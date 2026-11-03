import { PRODUCTION_SITE_URL } from "@/lib/ogPreview";
import { generateQrMatrix } from "@/lib/qrCode";

export interface FlyerCardOptions {
  kind: "listing" | "shop";
  title: string;
  subtitle: string; // e.g. "ZMW 1,800 / month" or "Campus Electronics & Repairs"
  locationText: string; // e.g. "Riverside, Kitwe • Near CBU"
  badges: string[]; // e.g. ["Bedsitter", "Solar Backup", "Borehole Water"]
  path: string; // e.g. "/accommodation/uuid" or "/shops/slug"
  filename: string;
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  return lines;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Generates and downloads a 1080x1350 PNG Noticeboard Flyer / WhatsApp Status Poster
 * with an embedded QR code pointing to `${PRODUCTION_SITE_URL}${options.path}`.
 */
export function downloadNoticeboardFlyer(options: FlyerCardOptions): void {
  const fullUrl = `${PRODUCTION_SITE_URL}${options.path.startsWith("/") ? options.path : `/${options.path}`}`;
  const qrMatrix = generateQrMatrix(fullUrl);

  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context unavailable");
  }

  // 1. Deep brand background gradient
  const grad = ctx.createLinearGradient(0, 0, 1080, 1350);
  grad.addColorStop(0, "#0b2447");
  grad.addColorStop(0.55, "#133b6e");
  grad.addColorStop(1, "#091931");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1080, 1350);

  // Subtle decorative accent circles
  ctx.fillStyle = "rgba(217, 119, 6, 0.14)";
  ctx.beginPath();
  ctx.arc(960, 160, 260, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(16, 185, 129, 0.10)";
  ctx.beginPath();
  ctx.arc(120, 1220, 280, 0, Math.PI * 2);
  ctx.fill();

  // 2. Top Brand Header Bar
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 44px system-ui, -apple-system, sans-serif";
  ctx.fillText("PLAWZA", 80, 115);

  ctx.fillStyle = "#fbbf24";
  ctx.font = "700 22px system-ui, -apple-system, sans-serif";
  ctx.fillText(
    options.kind === "listing"
      ? "VERIFIED CAMPUS ACCOMMODATION"
      : "CAMPUS STUDENT DIRECTORY & SHOPS",
    80,
    152
  );

  // 3. Main White Content Card
  drawRoundedRect(ctx, 64, 200, 952, 1060, 40);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // Top highlight pill inside card
  drawRoundedRect(ctx, 114, 254, 340, 54, 27);
  ctx.fillStyle = options.kind === "listing" ? "#ecfdf5" : "#eff6ff";
  ctx.fill();

  ctx.fillStyle = options.kind === "listing" ? "#047857" : "#1d4ed8";
  ctx.font = "800 22px system-ui, -apple-system, sans-serif";
  ctx.fillText(
    options.kind === "listing" ? "AVAILABLE STUDENT STAY" : "CAMPUS SHOP CATALOGUE",
    142,
    289
  );

  // Title (up to 2 lines)
  ctx.fillStyle = "#0f172a";
  ctx.font = "900 54px system-ui, -apple-system, sans-serif";
  const titleLines = wrapCanvasText(ctx, options.title, 850, 2);
  let yCursor = 385;
  for (const line of titleLines) {
    ctx.fillText(line, 114, yCursor);
    yCursor += 66;
  }

  // Price / Subtitle Banner
  yCursor += 10;
  drawRoundedRect(ctx, 114, yCursor, 852, 108, 24);
  ctx.fillStyle = "#0f2c59";
  ctx.fill();

  ctx.fillStyle = "#fbbf24";
  ctx.font = "900 48px system-ui, -apple-system, sans-serif";
  ctx.fillText(options.subtitle, 150, yCursor + 70);

  yCursor += 158;

  // Location Row
  ctx.fillStyle = "#334155";
  ctx.font = "700 30px system-ui, -apple-system, sans-serif";
  const locLines = wrapCanvasText(ctx, `Location: ${options.locationText}`, 850, 2);
  for (const line of locLines) {
    ctx.fillText(line, 114, yCursor);
    yCursor += 42;
  }

  // Feature Badges
  if (options.badges.length > 0) {
    yCursor += 20;
    let xBadge = 114;
    ctx.font = "700 23px system-ui, -apple-system, sans-serif";
    for (const badge of options.badges.slice(0, 5)) {
      const textWidth = ctx.measureText(badge).width;
      const pillW = textWidth + 44;
      if (xBadge + pillW > 960) {
        xBadge = 114;
        yCursor += 64;
      }
      drawRoundedRect(ctx, xBadge, yCursor, pillW, 50, 14);
      ctx.fillStyle = "#f1f5f9";
      ctx.fill();
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#0f172a";
      ctx.fillText(badge, xBadge + 22, yCursor + 33);
      xBadge += pillW + 16;
    }
  }

  // Divider line before QR footer
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(114, 860);
  ctx.lineTo(966, 860);
  ctx.stroke();

  // 4. QR Code Box on the right + Call-To-Action instructions on the left
  const qrSize = qrMatrix.length;
  const qrBoxSize = 310;
  const qrX = 640;
  const qrY = 895;

  drawRoundedRect(ctx, qrX, qrY, qrBoxSize, qrBoxSize, 24);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 4;
  ctx.stroke();

  const quietZone = 3;
  const totalModules = qrSize + quietZone * 2;
  const modulePx = Math.floor((qrBoxSize - 24) / totalModules);
  const offsetPx = Math.floor((qrBoxSize - modulePx * totalModules) / 2);

  ctx.fillStyle = "#0f172a";
  for (let r = 0; r < qrSize; r++) {
    const row = qrMatrix[r];
    if (!row) continue;
    for (let c = 0; c < qrSize; c++) {
      if (row[c]) {
        ctx.fillRect(
          qrX + offsetPx + (c + quietZone) * modulePx,
          qrY + offsetPx + (r + quietZone) * modulePx,
          modulePx,
          modulePx
        );
      }
    }
  }

  // Left side of QR section
  ctx.fillStyle = "#0f172a";
  ctx.font = "900 36px system-ui, -apple-system, sans-serif";
  ctx.fillText("Scan to View Photos", 114, 955);
  ctx.fillText("& Contact Directly", 114, 1002);

  ctx.fillStyle = "#475569";
  ctx.font = "600 24px system-ui, -apple-system, sans-serif";
  ctx.fillText("1. Open your phone camera or WhatsApp", 114, 1060);
  ctx.fillText("2. Point at the QR code on the right", 114, 1098);
  ctx.fillText("3. View full details on Plawza", 114, 1136);

  ctx.fillStyle = "#b45309";
  ctx.font = "700 20px system-ui, -apple-system, sans-serif";
  ctx.fillText("Safety rule: Inspect in person before paying.", 114, 1192);

  // Bottom URL bar
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "600 20px monospace";
  ctx.fillText(fullUrl.slice(0, 68), 80, 1310);

  // Trigger PNG download
  const dataUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.download = options.filename.endsWith(".png") ? options.filename : `${options.filename}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
