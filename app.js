const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("drop-zone");
const previewGrid = document.getElementById("previewGrid");
const convertBtn = document.getElementById("convertBtn");
const pageSizeSelect = document.getElementById("pageSize");
const maxPdfSizeInput = document.getElementById("maxPdfSize");

const MAX_PDF_MB = parseFloat(maxPdfSizeInput.value) || 10;
const PDF_OVERHEAD_MB = 0.6; // safety buffer
const MAX_IMG_DIM = 2000;    // pixels


let images = [];
let dragIndex = null;

//drag and drop handler
dropZone.addEventListener("dragover", e => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", e => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  handleFiles(e.dataTransfer.files);
});


fileInput.addEventListener("change", e => {
  handleFiles(e.target.files);
});

//file handler
function handleFiles(files) {
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;

    images.push({
      file,
      url: URL.createObjectURL(file)
    });
  }
  renderPreviews();
}

// image previews
function renderPreviews() {
  previewGrid.innerHTML = "";

  images.forEach((imgObj, index) => {
    const card = document.createElement("div");
    card.className = "image-card";
    card.draggable = true;

    card.addEventListener("dragstart", () => {
      dragIndex = index;
      card.classList.add("dragging");
    });

    card.addEventListener("dragend", () => {
      dragIndex = null;
      card.classList.remove("dragging");
    });

    card.addEventListener("dragover", e => e.preventDefault());

    card.addEventListener("drop", () => {
      if (dragIndex === null || dragIndex === index) return;

      const dragged = images[dragIndex];
      images.splice(dragIndex, 1);
      images.splice(index, 0, dragged);

      renderPreviews();
    });

    const img = document.createElement("img");
    img.src = imgObj.url;

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.onclick = () => {
      URL.revokeObjectURL(imgObj.url);
      images.splice(index, 1);
      renderPreviews();
    };

    card.appendChild(img);
    card.appendChild(removeBtn);
    previewGrid.appendChild(card);
  });

  convertBtn.disabled = images.length === 0;
}

// convert to PDF
convertBtn.addEventListener("click", async () => {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({
    unit: "mm",
    format: pageSizeSelect.value
  });

  // Calculate target size per image
  const imageCount = images.length;
  const totalBytes =
    (MAX_PDF_MB - PDF_OVERHEAD_MB) * 1024 * 1024;

  const perImageBudget = totalBytes / imageCount;

  for (let i = 0; i < images.length; i++) {
    const img = await loadImage(images[i].url);

    const compressedBlob = await compressImageToBudget(
      img,
      perImageBudget
    );

    const imgData = await new Promise(res => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result);
      reader.readAsDataURL(compressedBlob);
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const ratio = Math.min(
      pageWidth / img.width,
      pageHeight / img.height
    );

    const width = img.width * ratio;
    const height = img.height * ratio;

    const x = (pageWidth - width) / 2;
    const y = (pageHeight - height) / 2;

    if (i !== 0) pdf.addPage();

    pdf.addImage(imgData, "JPEG", x, y, width, height);
  }

  pdf.save("images.pdf");
});

function loadImage(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = src;
  });
}

// Resize images to fit constraints before adding to PDF
async function compressImageToBudget(img, targetBytes) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // Resize large images early
  let { width, height } = img;
  const scale = Math.min(1, MAX_IMG_DIM / Math.max(width, height));
  width *= scale;
  height *= scale;

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);

  // Adaptive JPEG quality
  for (let quality = 0.85; quality >= 0.4; quality -= 0.05) {
    const blob = await new Promise(res =>
      canvas.toBlob(res, "image/jpeg", quality)
    );

    if (blob.size <= targetBytes) {
      return blob;
    }
  }

  // fallback (lowest quality)
  return await new Promise(res =>
    canvas.toBlob(res, "image/jpeg", 0.4)
  );
}
