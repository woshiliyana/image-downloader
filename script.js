document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const pasteBtn = document.getElementById('paste-btn');
    const previewBtn = document.getElementById('preview-btn');
    const imageUrlsTextarea = document.getElementById('image-urls');
    const imageGallery = document.getElementById('image-gallery');
    const selectAllBtn = document.getElementById('select-all');
    const deselectAllBtn = document.getElementById('deselect-all');
    const downloadSelectedBtn = document.getElementById('download-selected');
    const selectedCountSpan = document.getElementById('selected-count');
    
    // State
    let selectedImages = new Set();
    
    // Event listeners
    pasteBtn.addEventListener('click', handlePasteFromClipboard);
    previewBtn.addEventListener('click', handlePreviewImages);
    selectAllBtn.addEventListener('click', selectAllImages);
    deselectAllBtn.addEventListener('click', deselectAllImages);
    downloadSelectedBtn.addEventListener('click', downloadSelectedImages);
    
    // Also allow pasting directly into the textarea
    imageUrlsTextarea.addEventListener('paste', () => {
        // Short delay to allow the paste to complete
        setTimeout(handlePreviewImages, 100);
    });
    
    // Extract valid image URLs from text
    function extractImageUrls(text) {
        if (!text.trim()) return [];
        
        // First, separate URLs that are stuck together
        text = text.replace(/(https?:\/\/)/g, '\n$1');
        
        // Split the text and process each potential URL
        let urls = text
            .split(/[\s\n]+/)  // Split by any whitespace or newline
            .map(url => url.trim())
            .filter(url => url.length > 0)
            .map(url => {
                // Clean up the URL
                return url
                    .replace(/^[\s"']+|[\s"']+$/g, '')  // Remove quotes and spaces
                    .replace(/[.,;]$/, '')  // Remove trailing punctuation
                    .replace(/\|$/, '')     // Remove trailing vertical bars
                    .replace(/@/, '');      // Remove @ symbol
            });

        // Keep only valid URLs
        urls = urls.filter(url => {
            try {
                return url.startsWith('http') &&
                       !url.includes(' ') &&   // URL shouldn't contain spaces
                       url.length > 10;        // Basic length check
            } catch (e) {
                return false;
            }
        });

        console.log('Found URLs:', urls); // Debug output

        // Filter valid image URLs
        return urls.filter(url => {
            try {
                // Accept s.coze.cn URLs directly
                if (url.includes('s.coze.cn/t/')) {
                    return true;
                }
                
                return url.match(/^https?:\/\//i) && 
                      (url.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i) || 
                       url.includes('image'));
            } catch (e) {
                return false;
            }
        });
    }
    
    // Handle paste from clipboard
    async function handlePasteFromClipboard() {
        try {
            const text = await navigator.clipboard.readText();
            console.log('Clipboard text:', text); // Debug output
            imageUrlsTextarea.value = text;
            handlePreviewImages();
        } catch (error) {
            showError('无法访问剪贴板。请确保您已授予权限，或直接在文本框中粘贴链接。');
            console.error('Clipboard error:', error);
        }
    }
    
    // Preview images
    function handlePreviewImages() {
        const text = imageUrlsTextarea.value;
        console.log('Processing text:', text); // Debug output
        const imageUrls = extractImageUrls(text);
        console.log('Extracted URLs:', imageUrls); // Debug output
        
        if (imageUrls.length === 0) {
            imageGallery.innerHTML = `
                <div class="empty-state">
                    未找到有效的图片链接。请确保链接格式正确。
                </div>
            `;
            downloadSelectedBtn.disabled = true;
            selectedCountSpan.textContent = '已选择: 0 张图片';
            selectedImages.clear();
            return;
        }
        
        // Clear gallery and selected images
        imageGallery.innerHTML = '';
        selectedImages.clear();
        updateSelectedCount();
        
        // Create image previews
        imageUrls.forEach((url, index) => {
            const imageContainer = document.createElement('div');
            imageContainer.className = 'image-container';
            imageContainer.dataset.url = url;
            
            // Extract filename from URL
            const filename = getFilenameFromUrl(url);
            
            // For s.coze.cn URLs, try to load them directly
            const imgSrc = url.includes('s.coze.cn/t/') ? url : url;
            
            imageContainer.innerHTML = `
                <img src="${imgSrc}" alt="Image ${index + 1}" loading="lazy" onerror="this.onerror=null; this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 100 100\'%3E%3Ctext x=\'50\' y=\'50\' font-size=\'12\' text-anchor=\'middle\' alignment-baseline=\'middle\' fill=\'%23999\'%3E加载失败%3C/text%3E%3C/svg%3E';">
                <input type="checkbox" class="checkbox">
                <div class="image-name">${filename}</div>
            `;
            
            imageGallery.appendChild(imageContainer);
            
            // Add click event to toggle selection
            imageContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('checkbox')) return;
                
                const checkbox = imageContainer.querySelector('.checkbox');
                checkbox.checked = !checkbox.checked;
                toggleImageSelection(imageContainer, checkbox.checked);
            });
            
            // Add change event to checkbox
            const checkbox = imageContainer.querySelector('.checkbox');
            checkbox.addEventListener('change', () => {
                toggleImageSelection(imageContainer, checkbox.checked);
            });
        });
        
        // Enable download button if there are images
        downloadSelectedBtn.disabled = selectedImages.size === 0;
    }
    
    // Toggle image selection
    function toggleImageSelection(imageContainer, isSelected) {
        const url = imageContainer.dataset.url;
        
        if (isSelected) {
            imageContainer.classList.add('selected');
            selectedImages.add(url);
        } else {
            imageContainer.classList.remove('selected');
            selectedImages.delete(url);
        }
        
        updateSelectedCount();
        downloadSelectedBtn.disabled = selectedImages.size === 0;
    }
    
    // Update selected count
    function updateSelectedCount() {
        selectedCountSpan.textContent = `已选择: ${selectedImages.size} 张图片`;
    }
    
    // Select all images
    function selectAllImages() {
        const containers = imageGallery.querySelectorAll('.image-container');
        containers.forEach(container => {
            const checkbox = container.querySelector('.checkbox');
            checkbox.checked = true;
            container.classList.add('selected');
            selectedImages.add(container.dataset.url);
        });
        updateSelectedCount();
        downloadSelectedBtn.disabled = selectedImages.size === 0;
    }
    
    // Deselect all images
    function deselectAllImages() {
        const containers = imageGallery.querySelectorAll('.image-container');
        containers.forEach(container => {
            const checkbox = container.querySelector('.checkbox');
            checkbox.checked = false;
            container.classList.remove('selected');
        });
        selectedImages.clear();
        updateSelectedCount();
        downloadSelectedBtn.disabled = true;
    }
    
    // Download selected images
    async function downloadSelectedImages() {
        if (selectedImages.size === 0) return;
        
        // Create a zip file if multiple images are selected
        if (selectedImages.size > 1) {
            try {
                // Check if JSZip is loaded
                if (typeof JSZip === 'undefined') {
                    // Dynamically load JSZip if not available
                    await loadJSZip();
                }
                
                const zip = new JSZip();
                const downloadPromises = [];
                
                // Add loading indicator
                const loadingIndicator = document.createElement('div');
                loadingIndicator.className = 'loading-indicator';
                loadingIndicator.textContent = '正在准备下载...';
                document.body.appendChild(loadingIndicator);
                
                // Add each selected image to the zip
                let completed = 0;
                let failed = 0;
                const errors = [];
                
                for (const url of selectedImages) {
                    const filename = getFilenameFromUrl(url);
                    const promise = fetch(url, {
                        method: 'GET',
                        mode: 'cors',
                        cache: 'no-cache',
                        headers: {
                            'Accept': 'image/*, */*'
                        }
                    })
                    .then(response => {
                        if (!response.ok) throw new Error(`Failed to fetch ${url}`);
                        return response.blob();
                    })
                    .then(blob => {
                        zip.file(filename, blob);
                        completed++;
                        loadingIndicator.textContent = `正在准备下载... (${completed}/${selectedImages.size})`;
                    })
                    .catch(error => {
                        console.error(`Error downloading ${url}:`, error);
                        failed++;
                        errors.push(url);
                        loadingIndicator.textContent = `正在准备下载... (${completed}/${selectedImages.size}, 失败: ${failed})`;
                    });
                    
                    downloadPromises.push(promise);
                    
                    // Add a small delay between requests to prevent overwhelming the server
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
                // Wait for all downloads to complete
                await Promise.allSettled(downloadPromises);
                
                // Show error message if some downloads failed
                if (failed > 0) {
                    showError(`${failed} 张图片下载失败。请重试或单独下载这些图片。`);
                    console.error('Failed URLs:', errors);
                }
                
                // Only create zip if at least one image was downloaded successfully
                if (completed > 0) {
                    // Generate the zip file
                    const zipBlob = await zip.generateAsync({ 
                        type: 'blob',
                        compression: 'STORE'  // No compression for images
                    });
                    
                    // Create download link
                    const downloadLink = document.createElement('a');
                    downloadLink.href = URL.createObjectURL(zipBlob);
                    downloadLink.download = `images_${new Date().toISOString().slice(0, 10)}.zip`;
                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                    document.body.removeChild(downloadLink);
                    
                    // Clean up
                    URL.revokeObjectURL(downloadLink.href);
                }
                
                document.body.removeChild(loadingIndicator);
                
            } catch (error) {
                console.error('Error creating zip file:', error);
                showError('创建ZIP文件时出错。尝试单独下载图片。');
                
                // Fallback: download images one by one
                for (const url of selectedImages) {
                    await downloadSingleImage(url);
                    // Add a small delay between downloads
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        } else {
            // Download single image
            downloadSingleImage(Array.from(selectedImages)[0]);
        }
    }
    
    // Download a single image
    async function downloadSingleImage(url) {
        try {
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache',
                headers: {
                    'Accept': 'image/*, */*'
                }
            });
            
            if (!response.ok) throw new Error(`Failed to fetch ${url}`);
            
            const blob = await response.blob();
            const filename = getFilenameFromUrl(url);
            const downloadUrl = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up
            URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error(`Error downloading ${url}:`, error);
            showError(`下载图片失败: ${getFilenameFromUrl(url)}`);
        }
    }
    
    // Extract filename from URL
    function getFilenameFromUrl(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            let filename = pathname.split('/').pop() || `image_${Date.now()}`;
            
            // Add extension if missing
            if (!filename.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i)) {
                filename += '.jpg';
            }
            
            return filename;
        } catch (e) {
            return `image_${Date.now()}.jpg`;
        }
    }
    
    // Show error message
    function showError(message) {
        // Remove any existing error
        const existingError = document.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        // Create new error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        // Insert after textarea
        imageUrlsTextarea.parentNode.insertBefore(errorDiv, imageUrlsTextarea.nextSibling);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }
    
    // Dynamically load JSZip
    async function loadJSZip() {
        return new Promise((resolve, reject) => {
            if (typeof JSZip !== 'undefined') {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            script.integrity = 'sha512-XMVd28F1oH/O71fzwBnV7HucLxVwtxf26XV8P4wPk26EDxuGZ91N8bsOttmnomcCD3CS5ZMRL50H0GgOHvegtg==';
            script.crossOrigin = 'anonymous';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load JSZip'));
            document.head.appendChild(script);
        });
    }
}); 