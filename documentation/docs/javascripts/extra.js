// TomCAD Documentation JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all custom functionality
    initCollapsibleNavigation();
    initKeyboardShortcuts();
    initTableEnhancements();
    initSearchEnhancements();
    initDarkModeToggle();
    initScrollToTop();
    initCodeCopyButtons();
});

// Enhanced navigation functionality - use default Material theme behavior
function initCollapsibleNavigation() {
    // Material theme already handles collapsible navigation
    // Just ensure proper styling is applied
    console.log('Navigation initialized with default Material theme behavior');
}

// Keyboard shortcuts
function initKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl+K for search
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.querySelector('[data-md-component="search-query"]');
            if (searchInput) {
                searchInput.focus();
            }
        }

        // Escape to close search
        if (e.key === 'Escape') {
            const searchInput = document.querySelector('[data-md-component="search-query"]');
            if (searchInput && searchInput === document.activeElement) {
                searchInput.blur();
            }
        }

        // Navigate with arrow keys
        if (e.altKey) {
            switch(e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    const prevLink = document.querySelector('[data-md-component="navigation"] .md-nav__link[rel="prev"]');
                    if (prevLink) prevLink.click();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    const nextLink = document.querySelector('[data-md-component="navigation"] .md-nav__link[rel="next"]');
                    if (nextLink) nextLink.click();
                    break;
            }
        }
    });
}

// Table enhancements
function initTableEnhancements() {
    document.querySelectorAll('table').forEach(table => {
        // Add responsive wrapper
        if (!table.closest('.table-wrapper')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'table-wrapper';
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        }

        // Add sorting functionality
        const headers = table.querySelectorAll('th');
        headers.forEach((header, index) => {
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => sortTable(table, index));
        });
    });
}

// Table sorting
function sortTable(table, columnIndex) {
    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll('tr'));
    const isAscending = !table.dataset.sortDirection || table.dataset.sortDirection === 'desc';

    rows.sort((a, b) => {
        const aValue = a.cells[columnIndex].textContent.trim();
        const bValue = b.cells[columnIndex].textContent.trim();

        // Try to parse as numbers
        const aNum = parseFloat(aValue);
        const bNum = parseFloat(bValue);

        if (!isNaN(aNum) && !isNaN(bNum)) {
            return isAscending ? aNum - bNum : bNum - aNum;
        }

        return isAscending ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    });

    rows.forEach(row => tbody.appendChild(row));
    table.dataset.sortDirection = isAscending ? 'asc' : 'desc';

    // Update header indicators
    table.querySelectorAll('th').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
    });
    headers[columnIndex].classList.add(isAscending ? 'sorted-asc' : 'sorted-desc');
}

// Search enhancements
function initSearchEnhancements() {
    const searchInput = document.querySelector('[data-md-component="search-query"]');
    if (searchInput) {
        // Add search shortcuts info
        searchInput.placeholder = 'Szukaj... (Ctrl+K)';
        
        // Highlight search terms
        searchInput.addEventListener('input', debounce(function() {
            const query = this.value.toLowerCase();
            if (query.length > 2) {
                highlightSearchTerms(query);
            } else {
                removeHighlights();
            }
        }, 300));
    }
}

// Search highlighting
function highlightSearchTerms(query) {
    const walker = document.createTreeWalker(
        document.querySelector('[data-md-component="main"]'),
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
        if (node.textContent.toLowerCase().includes(query)) {
            textNodes.push(node);
        }
    }

    textNodes.forEach(textNode => {
        const parent = textNode.parentNode;
        if (parent.tagName !== 'MARK') {
            const html = textNode.textContent.replace(
                new RegExp(`(${query})`, 'gi'),
                '<mark>$1</mark>'
            );
            const wrapper = document.createElement('span');
            wrapper.innerHTML = html;
            parent.replaceChild(wrapper, textNode);
        }
    });
}

// Remove search highlights
function removeHighlights() {
    document.querySelectorAll('mark').forEach(mark => {
        const parent = mark.parentNode;
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        parent.normalize();
    });
}

// Dark mode toggle enhancement
function initDarkModeToggle() {
    const toggle = document.querySelector('[data-md-component="palette"]');
    if (toggle) {
        toggle.addEventListener('change', function() {
            // Save preference
            localStorage.setItem('theme', this.checked ? 'dark' : 'light');
            
            // Update mermaid theme
            if (window.mermaid) {
                window.mermaid.initialize({
                    theme: this.checked ? 'dark' : 'light'
                });
            }
        });
    }
}

// Scroll to top functionality
function initScrollToTop() {
    const scrollBtn = document.createElement('button');
    scrollBtn.className = 'scroll-to-top';
    scrollBtn.innerHTML = '↑';
    scrollBtn.title = 'Scroll to top';
    scrollBtn.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--md-primary-fg-color);
        color: white;
        border: none;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        font-size: 20px;
        cursor: pointer;
        display: none;
        z-index: 1000;
        transition: opacity 0.3s ease;
    `;

    document.body.appendChild(scrollBtn);

    scrollBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            scrollBtn.style.display = 'block';
        } else {
            scrollBtn.style.display = 'none';
        }
    });
}

// Code copy buttons
function initCodeCopyButtons() {
    document.querySelectorAll('pre code').forEach(codeBlock => {
        const pre = codeBlock.parentElement;
        const button = document.createElement('button');
        button.className = 'copy-code-btn';
        button.textContent = 'Copy';
        button.style.cssText = `
            position: absolute;
            top: 0.5rem;
            right: 0.5rem;
            background: var(--md-default-fg-color--lightest);
            border: 1px solid var(--md-default-fg-color--lighter);
            color: var(--md-default-fg-color);
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.8rem;
            cursor: pointer;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        if (pre.style.position !== 'relative') {
            pre.style.position = 'relative';
        }

        pre.appendChild(button);

        pre.addEventListener('mouseenter', () => {
            button.style.opacity = '1';
        });

        pre.addEventListener('mouseleave', () => {
            button.style.opacity = '0';
        });

        button.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(codeBlock.textContent);
                button.textContent = 'Copied!';
                setTimeout(() => {
                    button.textContent = 'Copy';
                }, 2000);
            } catch (err) {
                console.error('Failed to copy: ', err);
            }
        });
    });
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Progress indicator
function addProgressIndicator() {
    const progress = document.createElement('div');
    progress.className = 'reading-progress';
    progress.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 0%;
        height: 3px;
        background: var(--md-primary-fg-color);
        z-index: 9999;
        transition: width 0.3s ease;
    `;

    document.body.appendChild(progress);

    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset;
        const docHeight = document.body.scrollHeight - window.innerHeight;
        const scrollPercent = (scrollTop / docHeight) * 100;
        progress.style.width = scrollPercent + '%';
    });
}

// Initialize reading progress
addProgressIndicator();

// Print functionality
function initPrint() {
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'p') {
            e.preventDefault();
            window.print();
        }
    });
}

initPrint();

// Analytics (placeholder for future implementation)
function trackPageView(page) {
    // Implementation for analytics tracking
    console.log('Page view:', page);
}

// Track current page
trackPageView(window.location.pathname);