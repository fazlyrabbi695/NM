document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const searchInput = document.getElementById('searchInput');
    const scrollSearchInput = document.getElementById('scrollSearchInput');
    const dataTable = document.getElementById('dataTable');
    const status = document.getElementById('status');
    const recordCount = document.getElementById('recordCount');
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');
    const passwordModal = document.getElementById('passwordModal');
    const passwordInput = document.getElementById('passwordInput');
    const submitPassword = document.getElementById('submitPassword');
    const cancelPassword = document.getElementById('cancelPassword');
    const passwordError = document.getElementById('passwordError');
    const menuButton = document.getElementById('menuButton');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const fixedNav = document.querySelector('.fixed-nav');
    const scrollMenuButton = document.getElementById('scrollMenuButton');
    const fixedPageInfo = document.getElementById('fixedPageInfo');
    const themeToggle = document.getElementById('themeToggle');
    const floatingThemeToggle = document.getElementById('floatingThemeToggle');

    // Constants
    const CORRECT_PASSWORD = 'NM786';
    const recordsPerPage = 10;

    // State variables
    let allData = [];
    let currentPage = 1;
    let filteredData = [];
    let loadedFiles = new Map();
    let selectedFiles = null;

    // Initialize: Load existing data if available
    try {
        if (typeof excelData !== 'undefined') {
            allData = excelData;
            displayData(allData);
            showStatus('Existing data loaded successfully!', 'success');
        }
    } catch (error) {
        console.log('No existing data found');
    }

    // Event Listeners
    fileInput.addEventListener('change', handleFileSelection);
    submitPassword.addEventListener('click', handlePasswordSubmit);
    cancelPassword.addEventListener('click', handlePasswordCancel);
    passwordInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') submitPassword.click();
    });
    passwordModal.addEventListener('click', (e) => {
        if (e.target === passwordModal) handlePasswordCancel();
    });
    menuButton.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', toggleSidebar);
    scrollMenuButton.addEventListener('click', toggleSidebar);

    // Sync search inputs
    function syncSearchInputs(sourceInput, targetInput) {
        targetInput.value = sourceInput.value;
        const event = new Event('input', { bubbles: true });
        targetInput.dispatchEvent(event);
    }

    searchInput.addEventListener('input', () => syncSearchInputs(searchInput, scrollSearchInput));
    scrollSearchInput.addEventListener('input', () => syncSearchInputs(scrollSearchInput, searchInput));

    // Search functionality
    function handleSearch(e) {
        const searchTerm = e.target.value.toLowerCase().trim();
        
        if (searchTerm === '') {
            displayData(allData);
            return;
        }

        const filteredData = allData.filter(row => 
            Object.values(row).some(value => 
                String(value).toLowerCase().includes(searchTerm)
            )
        );

        displayData(filteredData);
    }

    searchInput.addEventListener('input', handleSearch);
    scrollSearchInput.addEventListener('input', handleSearch);

    // Scroll behavior for fixed navigation
    let lastScrollTop = 0;
    const scrollThreshold = 200; // Show after scrolling 200px
    let scrollTimer = null;

    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Show/hide fixed navigation based on scroll position
        if (scrollTop > scrollThreshold) {
            fixedNav.classList.add('visible');
            if (searchInput === document.activeElement) {
                scrollSearchInput.focus();
            }
        } else {
            fixedNav.classList.remove('visible');
            if (scrollSearchInput === document.activeElement) {
                searchInput.focus();
            }
        }
        
        // Update last scroll position
        lastScrollTop = scrollTop;

        // Hide fixed nav after 2 seconds of no scrolling
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
            if (!sidebar.classList.contains('active') && 
                scrollSearchInput !== document.activeElement) {
                fixedNav.classList.remove('visible');
            }
        }, 2000);
    });

    // Update fixed page info when pagination changes
    function updateFixedPageInfo() {
        const pageInfo = document.getElementById('pageInfo').textContent;
        fixedPageInfo.textContent = pageInfo;
    }

    // File Selection Handler
    function handleFileSelection(e) {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            selectedFiles = files;
            showPasswordModal();
        }
    }

    // Password Modal Functions
    function showPasswordModal() {
        passwordModal.style.display = 'block';
        passwordInput.value = '';
        passwordError.style.display = 'none';
        setTimeout(() => passwordInput.focus(), 100);
    }

    function hidePasswordModal() {
        passwordModal.style.display = 'none';
        passwordInput.value = '';
        passwordError.style.display = 'none';
    }

    function handlePasswordSubmit() {
        const enteredPassword = passwordInput.value;
        if (enteredPassword === CORRECT_PASSWORD) {
            hidePasswordModal();
            processFiles(selectedFiles);
        } else {
            passwordError.textContent = 'Incorrect password. Please try again.';
            passwordError.style.display = 'block';
            passwordInput.value = '';
            passwordInput.focus();
        }
    }

    function handlePasswordCancel() {
        hidePasswordModal();
        fileInput.value = '';
        selectedFiles = null;
    }

    // File Processing Functions
    async function processFiles(files) {
        if (!files || files.length === 0) return;

        showStatus('Loading files...', 'info');

        try {
            for (const file of files) {
                if (!loadedFiles.has(file.name)) {
                    const data = await readExcelFile(file);
                    if (data && data.length > 0) {
                        loadedFiles.set(file.name, data);
                        updateFileList();
                    }
                }
            }

            const newData = Array.from(loadedFiles.values()).flat();
            allData = processData(newData);
            displayData(allData);
            saveDataToFile(allData);
            showStatus('Files processed successfully!', 'success');

        } catch (error) {
            console.error('Error processing files:', error);
            showStatus('Error processing files. Please check the format.', 'error');
        }

        fileInput.value = '';
        selectedFiles = null;
    }

    async function readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                        raw: false,
                        dateNF: 'dd-mm-yyyy hh:mm:ss'
                    });
                    resolve(jsonData);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }

    function processData(data) {
        return data.map(row => {
            const newRow = { ...row };
            Object.keys(newRow).forEach(key => {
                if (key === 'Installation Date' || (typeof newRow[key] === 'number' && key.toLowerCase().includes('date'))) {
                    try {
                        if (typeof newRow[key] === 'number') {
                            const date = new Date((newRow[key] - (25567 + 2)) * 86400 * 1000);
                            if (!isNaN(date.getTime())) {
                                newRow[key] = formatDateTime(date);
                            }
                        } else if (typeof newRow[key] === 'string') {
                            const date = new Date(newRow[key]);
                            if (!isNaN(date.getTime())) {
                                newRow[key] = formatDateTime(date);
                            }
                        }
                    } catch (e) {
                        console.log('Date conversion failed for:', newRow[key]);
                    }
                }
            });
            return newRow;
        });
    }

    function saveDataToFile(data) {
        const jsContent = `const excelData = ${JSON.stringify(data, null, 2)};`;
        const blob = new Blob([jsContent], { type: 'application/javascript' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'excel_data.js';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        showStatus('Data file (excel_data.js) has been downloaded. Please copy it to your app folder.', 'success');
    }

    // UI Update Functions
    function showStatus(message, type = 'info') {
        const status = document.getElementById('status');
        status.textContent = message;
        status.className = `status-message ${type}`;
        status.style.display = 'block';
        
        // Add fade-in effect
        status.style.opacity = '0';
        setTimeout(() => status.style.opacity = '1', 10);

        // Auto-hide after 3 seconds
        setTimeout(() => {
            // Add fade-out effect
            status.style.opacity = '0';
            setTimeout(() => {
                status.style.display = 'none';
                status.textContent = '';
            }, 300);
        }, 3000);
    }

    function updateFileList() {
        fileList.innerHTML = '';
        if (loadedFiles.size === 0) {
            fileList.style.display = 'none';
            return;
        }

        fileList.style.display = 'block';
        for (const [fileName, _] of loadedFiles) {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'file-name';
            nameSpan.textContent = fileName;
            
            const removeButton = document.createElement('button');
            removeButton.className = 'file-remove';
            removeButton.textContent = 'Remove';
            removeButton.onclick = () => removeFile(fileName);
            
            fileItem.appendChild(nameSpan);
            fileItem.appendChild(removeButton);
            fileList.appendChild(fileItem);
        }
    }

    function removeFile(fileName) {
        loadedFiles.delete(fileName);
        updateFileList();
        const remainingData = Array.from(loadedFiles.values()).flat();
        allData = processData(remainingData);
        if (allData.length > 0) {
            saveDataToFile(allData);
        }
        displayData(allData);
    }

    function formatDateTime(date) {
        try {
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const seconds = date.getSeconds().toString().padStart(2, '0');
            return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
        } catch (e) {
            return '';
        }
    }

    function displayData(data) {
        if (!data || data.length === 0) {
            dataTable.innerHTML = '<tr><td colspan="100%">No data available</td></tr>';
            recordCount.textContent = 'No records to display';
            updatePaginationControls(0);
            return;
        }

        const startIndex = (currentPage - 1) * recordsPerPage;
        const endIndex = Math.min(startIndex + recordsPerPage, data.length);
        const pageData = data.slice(startIndex, endIndex);

        const headers = Object.keys(data[0]);
        const headerRow = '<tr>' + headers.map(header => 
            `<th>${header}</th>`
        ).join('') + '</tr>';

        const rows = pageData.map(row => {
            return '<tr>' + headers.map(header => 
                `<td>${row[header] || ''}</td>`
            ).join('') + '</tr>';
        }).join('');

        dataTable.innerHTML = `<thead>${headerRow}</thead><tbody>${rows}</tbody>`;
        recordCount.textContent = `Showing ${startIndex + 1}-${endIndex} of ${data.length} records`;
        
        updatePaginationControls(data.length);
        updateTableCellLabels();
        updateFixedPageInfo();
    }

    function updatePaginationControls(totalRecords) {
        const maxPage = Math.ceil(totalRecords / recordsPerPage);
        pageInfo.textContent = totalRecords > 0 ? `Page ${currentPage} of ${maxPage}` : 'Page 0 of 0';
        prevPage.disabled = currentPage <= 1;
        nextPage.disabled = currentPage >= maxPage;
        const paginationDiv = document.querySelector('.pagination');
        paginationDiv.style.display = totalRecords > 0 ? 'block' : 'none';
    }

    // Theme Toggle
    const getPreferredTheme = () => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            return savedTheme;
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    const setTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        // Update both buttons' aria-labels
        [themeToggle, floatingThemeToggle].forEach(btn => {
            if (btn) {
                btn.setAttribute('aria-label', 
                    `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`
                );
            }
        });
    };

    // Initialize theme with transition disabled
    document.documentElement.classList.remove('theme-transition');
    setTheme(getPreferredTheme());
    
    // Enable transitions after initial theme is set
    setTimeout(() => {
        document.documentElement.classList.add('theme-transition');
    }, 0);

    // Theme toggle click handler for both buttons
    const handleThemeToggle = (button) => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        // Add animation classes to both buttons
        [themeToggle, floatingThemeToggle].forEach(btn => {
            if (btn) {
                btn.classList.add('theme-toggle-animation');
                setTimeout(() => {
                    btn.classList.remove('theme-toggle-animation');
                }, 500);
            }
        });
        
        setTheme(newTheme);
    };

    // Add click handlers to both buttons
    themeToggle.addEventListener('click', () => handleThemeToggle(themeToggle));
    floatingThemeToggle.addEventListener('click', () => handleThemeToggle(floatingThemeToggle));

    // Handle system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            setTheme(e.matches ? 'dark' : 'light');
        }
    });

    // Menu functionality
    function toggleSidebar() {
        const isOpen = sidebar.classList.contains('active');
        
        // Toggle classes
        sidebar.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
        document.body.style.overflow = isOpen ? '' : 'hidden';
        
        // Update button states
        const buttons = [menuButton, scrollMenuButton];
        buttons.forEach(btn => {
            if (btn) {
                btn.setAttribute('aria-expanded', !isOpen);
                const icon = btn.querySelector('i');
                if (icon) {
                    icon.classList.toggle('fa-bars-staggered');
                    icon.classList.toggle('fa-xmark');
                }
            }
        });
        
        // Keep fixed nav visible when menu is open
        if (!isOpen) {
            fixedNav.classList.add('visible');
        } else {
            // Check scroll position to determine if fixed nav should be visible
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            if (scrollTop <= scrollThreshold) {
                fixedNav.classList.remove('visible');
            }
        }
    }

    // Close sidebar when clicking outside
    document.addEventListener('click', (e) => {
        const isClickInsideSidebar = sidebar.contains(e.target);
        const isClickOnMenuButton = menuButton.contains(e.target) || 
                                  (scrollMenuButton && scrollMenuButton.contains(e.target));
        
        if (sidebar.classList.contains('active') && !isClickInsideSidebar && !isClickOnMenuButton) {
            toggleSidebar();
        }
    });

    // Close sidebar when pressing Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar.classList.contains('active')) {
            toggleSidebar();
        }
    });

    // Handle table cell labels for mobile view
    function updateTableCellLabels() {
        const table = document.getElementById('dataTable');
        const headerCells = table.querySelectorAll('thead th');
        const dataCells = table.querySelectorAll('tbody td');
        
        const headers = Array.from(headerCells).map(cell => cell.textContent);
        
        dataCells.forEach((cell, index) => {
            cell.setAttribute('data-label', headers[index % headers.length]);
        });
    }

    // Pagination controls
    prevPage.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayData(filteredData.length > 0 ? filteredData : allData);
        }
    });

    nextPage.addEventListener('click', () => {
        const dataToUse = filteredData.length > 0 ? filteredData : allData;
        const maxPage = Math.ceil(dataToUse.length / recordsPerPage);
        if (currentPage < maxPage) {
            currentPage++;
            displayData(dataToUse);
        }
    });
});
