/* ============================================
   Traffic Monitoring System — Main JS
   Drag & Drop · Preview · Counters · Lightbox
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

    // ---------- Elements ----------
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const uploadForm = document.getElementById('uploadForm');
    const filePreview = document.getElementById('filePreview');
    const previewThumb = document.getElementById('previewThumb');
    const previewName = document.getElementById('previewName');
    const previewSize = document.getElementById('previewSize');
    const previewRemove = document.getElementById('previewRemove');
    const submitBtn = document.getElementById('submitBtn');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const confidenceSlider = document.getElementById('confidenceSlider');
    const confidenceValue = document.getElementById('confidenceValue');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxClose = document.getElementById('lightboxClose');

    // ---------- Drag & Drop ----------
    if (dropZone) {
        ['dragenter', 'dragover'].forEach(evt => {
            dropZone.addEventListener(evt, e => {
                e.preventDefault();
                dropZone.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach(evt => {
            dropZone.addEventListener(evt, e => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
            });
        });

        dropZone.addEventListener('drop', e => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                showPreview(files[0]);
            }
        });

        dropZone.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                showPreview(fileInput.files[0]);
            }
        });
    }

    // ---------- File Preview ----------
    function showPreview(file) {
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
            return;
        }

        previewName.textContent = file.name;
        previewSize.textContent = formatFileSize(file.size);

        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = e => {
                previewThumb.src = e.target.result;
            };
            reader.readAsDataURL(file);
        } else {
            previewThumb.src = '';
        }

        filePreview.classList.add('visible');
        submitBtn.disabled = false;
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }

    if (previewRemove) {
        previewRemove.addEventListener('click', e => {
            e.stopPropagation();
            fileInput.value = '';
            filePreview.classList.remove('visible');
            submitBtn.disabled = true;
        });
    }

    // ---------- Confidence Slider ----------
    if (confidenceSlider) {
        confidenceSlider.addEventListener('input', () => {
            confidenceValue.textContent = confidenceSlider.value + '%';
        });
    }

    // ---------- Form Submit — Show Loader ----------
    if (uploadForm) {
        uploadForm.addEventListener('submit', () => {
            if (fileInput.files.length > 0) {
                loadingOverlay.classList.add('active');
            }
        });
    }

    // ---------- Animated Counters ----------
    const counters = document.querySelectorAll('[data-count]');
    if (counters.length > 0) {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        counters.forEach(el => observer.observe(el));
    }

    function animateCounter(el) {
        const target = parseFloat(el.getAttribute('data-count'));
        const isFloat = target % 1 !== 0;
        const suffix = el.getAttribute('data-suffix') || '';
        const duration = 1200;
        const start = performance.now();

        function update(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            const current = target * eased;

            el.textContent = (isFloat ? current.toFixed(1) : Math.round(current)) + suffix;

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }
        requestAnimationFrame(update);
    }

    // ---------- Class Bar Animation ----------
    const classBars = document.querySelectorAll('.class-bar-fill');
    if (classBars.length > 0) {
        const barObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = entry.target.getAttribute('data-width');
                    entry.target.style.width = target + '%';
                    barObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });

        classBars.forEach(bar => {
            bar.style.width = '0%';
            barObserver.observe(bar);
        });
    }

    // ---------- Confidence Bar Animation ----------
    const confBars = document.querySelectorAll('.confidence-bar-fill');
    if (confBars.length > 0) {
        const confObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = entry.target.getAttribute('data-width');
                    entry.target.style.width = target + '%';
                    confObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });

        confBars.forEach(bar => {
            bar.style.width = '0%';
            confObserver.observe(bar);
        });
    }

    // ---------- Image Lightbox ----------
    const resultImages = document.querySelectorAll('.result-image-wrapper img');
    resultImages.forEach(img => {
        img.addEventListener('click', () => {
            lightboxImg.src = img.src;
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    });

    if (lightbox) {
        lightbox.addEventListener('click', e => {
            if (e.target === lightbox || e.target === lightboxClose) {
                closeLightbox();
            }
        });

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && lightbox.classList.contains('active')) {
                closeLightbox();
            }
        });
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }

    // ---------- Staggered Fade-In for Result Rows ----------
    const tableRows = document.querySelectorAll('.detections-table tbody tr');
    tableRows.forEach((row, i) => {
        row.style.opacity = '0';
        row.style.transform = 'translateY(8px)';
        row.style.transition = `all 0.4s ease-out ${i * 0.05}s`;
        requestAnimationFrame(() => {
            row.style.opacity = '1';
            row.style.transform = 'translateY(0)';
        });
    });

    // ---------- Staggered Fade-In for Stat Cards ----------
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach((card, i) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(16px)';
        card.style.transition = `all 0.5s ease-out ${i * 0.1}s`;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            });
        });
    });

});
