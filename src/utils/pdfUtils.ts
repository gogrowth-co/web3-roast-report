
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from "sonner";

/**
 * Captures a DOM element and converts it to a PDF document for download
 * @param elementId The ID of the element to capture
 * @param filename The name of the PDF file to download
 */
export const downloadElementAsPdf = async (elementId: string, filename: string) => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with ID "${elementId}" not found`);
    }

    console.log("Starting PDF generation for element:", elementId);
    
    // Capture the element as a canvas
    const canvas = await html2canvas(element, {
      scale: 2, // Higher scale for better quality
      useCORS: true, // Enable cross-origin image handling
      logging: false,
      backgroundColor: "#000000" // Match the dark theme background
    });
    
    console.log("Canvas created with dimensions:", canvas.width, "x", canvas.height);
    
    // Calculate dimensions for the PDF
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Create PDF document
    const pdf = new jsPDF({
      orientation: imgHeight > imgWidth ? 'portrait' : 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    // Add the image to the PDF
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    
    // Download the PDF
    pdf.save(filename);
    
    console.log("PDF generated successfully:", filename);
    return true;
  } catch (error) {
    console.error("PDF generation error:", error);
    toast.error("Failed to generate PDF", {
      description: error instanceof Error ? error.message : "Please try again"
    });
    return false;
  }
};
