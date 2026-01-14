const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("drop-zone");
const fileList = document.getElementById("fileList");
const convertBtn = document.getElementById("convertBtn");
const pageSizeSelect = document.getElementById("pageSize");

let images = [];

//drag and drop handlers
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  handleFiles(e.dataTransfer.files);
});

// file input handlers
fileInput.addEventListener("change", (e) => {
  handleFiles(e.target.files);
});

function handleFiles(files) {
  for (const file of files) {
    if (file.type.startsWith("image/")) {
      images.push(file);
    }
  }
  renderList();
}

//render file list
function renderList() {
  fileList.innerHTML = "";
  images.forEach((img, i) => {
    const li = document.createElement("li");
    li.textContent = `${i + 1}. ${img.name}`;
    fileList.appendChild(li);
  });

  convertBtn.disabled = images.length === 0;
}

//convert to PDF
convertBtn.addEventListener("click", async () => {
  const { jsPDF } = window.jspdf;

  const pageSize = pageSizeSelect.value;
  const pdf = new jsPDF({
    format: pageSize,
    unit: "mm"
  });

  for (let i = 0; i < images.length; i++) {
    const imgData = await fileToDataURL(images[i]);
    const img = await loadImage(imgData);

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
    pdf.addImage(img, "JPEG", x, y, width, height);
  }

  pdf.save("images.pdf");
});

function fileToDataURL(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = src;
  });
}
