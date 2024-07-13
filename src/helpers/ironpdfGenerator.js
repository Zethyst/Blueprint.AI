import fs from "fs/promises";
import PDFDocument from "pdfkit";
import path from "path";
const __dirname = path.resolve();
import { PdfDocument } from "@ironsoftware/ironpdf";

export async function createPdf(title, text, username) {
  const fileName = `${username}_${Date.now()}`;
  const documentsPath = path.join(__dirname, "assets", "documents");

  // Check if the directory exists, if not create it
  try {
    await fs.access(documentsPath);
  } catch (error) {
    // Directory does not exist, create it
    await fs.mkdir(documentsPath, { recursive: true });
  }

  const pdfPath = path.join(documentsPath, `${fileName}.pdf`);

  // Render the HTML string
  const pdf = await PdfDocument.fromHtml(`<h1>${title}</h1><p>${text}</p>`);

  // Export the PDF document to the correct path
  await pdf.saveAs(pdfPath);

  return pdfPath;
}
