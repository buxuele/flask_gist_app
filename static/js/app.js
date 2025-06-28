document.addEventListener('DOMContentLoaded', () => {

    const gistsContainer = document.getElementById('gists-container');
    const addGistForm = document.getElementById('addGistForm');
    const addGistModal = new bootstrap.Modal(document.getElementById('addGistModal'));
    const modalElement = document.getElementById('addGistModal');
    const fileUploadInput = document.getElementById('gistFileUpload');

    // --- 数据获取与渲染 ---
    const fetchAndRenderGists = async () => {
        try {
            const response = await fetch('/api/gists');
            if (!response.ok) throw new Error('网络响应错误');
            const gists = await response.json();
            renderGists(gists);
        } catch (error) {
            console.error('获取片段失败:', error);
            gistsContainer.innerHTML = `<div class="alert alert-danger" role="alert">加载失败了... 错误详情: ${error.message}</div>`;
        }
    };

    const renderGists = (gists) => {
        gistsContainer.innerHTML = '';
        if (gists.length === 0) {
            gistsContainer.innerHTML = '<p class="text-center text-muted mt-5">空空如也，快添加你的第一个知识片段吧！</p>';
            return;
        }

        gists.forEach(gist => {
            const card = document.createElement('div');
            card.className = 'card';
            card.dataset.gist = JSON.stringify(gist); 
            
            const renderedBlock = renderCodeBlock(gist);

            // --- 核心改动点：用 <a> 标签包裹头部，并给按钮添加 data-no-link 属性 ---
            card.innerHTML = `
                <a href="/gist/${gist.id}" target="_blank" class="card-header-link">
                    <div class="card-header">
                        <div class="header-info" title="${escapeHTML(gist.description)}">
                            <div class="gist-filename">${escapeHTML(gist.filename)}</div>
                            <div class="gist-description">${escapeHTML(gist.description)}</div>
                        </div>
                        <div class="actions">
                            <button class="btn btn-sm btn-icon-text btn-edit" title="修改" data-no-link="true"><i class="bi bi-pencil-square"></i><span>修改</span></button>
                            <button class="btn btn-sm btn-icon-text btn-delete" title="删除" data-no-link="true"><i class="bi bi-trash"></i><span>删除</span></button>
                            <button class="btn btn-sm btn-icon-text btn-copy" title="复制" data-no-link="true"><i class="bi bi-clipboard"></i><span>复制</span></button>
                        </div>
                    </div>
                </a>
                <div class="card-body">
                    ${renderedBlock.html}
                </div>
                ${renderedBlock.isLong ? `
                <div class="card-footer">
                    <button class="btn btn-sm btn-toggle-expand">
                        <i class="bi bi-chevron-down"></i> 显示更多
                    </button>
                </div>
                ` : ''}
            `;
            gistsContainer.appendChild(card);
        });
    };

    // --- 事件监听 (核心改动：增加事件冒泡阻止逻辑) ---
    gistsContainer.addEventListener('click', async (event) => {
        const button = event.target.closest('button');

        // --- 核心改动点：如果点击的是带特定属性的按钮，就阻止链接跳转 ---
        if (button && button.dataset.noLink === 'true') {
            event.preventDefault(); // 阻止 <a> 标签的默认跳转行为
        }
        
        // 如果没有点击到按钮上，就直接退出，让链接正常工作
        if (!button) return;

        const card = button.closest('.card');
        const gist = JSON.parse(card.dataset.gist);
        
        if (button.classList.contains('btn-toggle-expand')) {
            const cardBody = card.querySelector('.card-body');
            const footer = card.querySelector('.card-footer');
            const isExpanded = cardBody.classList.contains('expanded');
            
            const renderedBlock = renderCodeBlock(gist, !isExpanded);
            
            cardBody.innerHTML = renderedBlock.html;
            
            if (footer) {
                button.innerHTML = isExpanded 
                    ? '<i class="bi bi-chevron-down"></i> 显示更多' 
                    : '<i class="bi bi-chevron-up"></i> 收起';
            }

            cardBody.classList.toggle('expanded');
            return; // 处理完毕，退出函数
        }
        
        // --- 下面的按钮逻辑保持不变 ---
        if (button.classList.contains('btn-edit')) { 
            document.getElementById('addGistModalLabel').textContent = '编辑片段';
            document.getElementById('gistIdInput').value = gist.id;
            document.getElementById('gistDescription').value = gist.description;
            document.getElementById('gistFilename').value = gist.filename;
            document.getElementById('gistContent').value = gist.content;
            addGistModal.show();
        }
        if (button.classList.contains('btn-copy')) { 
            navigator.clipboard.writeText(gist.content.trim()).then(() => {
                const icon = button.querySelector('i');
                const text = button.querySelector('span');
                const originalIconClass = icon.className;
                const originalText = text.textContent;
                icon.className = 'bi bi-check-lg';
                text.textContent = '已复制!';
                button.classList.add('btn-success-custom');
                setTimeout(() => {
                    icon.className = originalIconClass;
                    text.textContent = originalText;
                    button.classList.remove('btn-success-custom');
                }, 1500);
            }).catch(err => console.error('复制失败:', err));
        }
        if (button.classList.contains('btn-delete')) {
            if (confirm(`确定要删除片段 "${gist.filename}" 吗？`)) {
                try {
                    const response = await fetch(`/api/gists/${gist.id}`, { method: 'DELETE' });
                    if (!response.ok) throw new Error('删除失败');
                    card.remove();
                } catch (error) {
                    console.error('删除失败:', error);
                    alert('删除失败！');
                }
            }
        }
    });
    
    // --- 后续其他函数保持不变 ---
    addGistForm.addEventListener('submit', async (event) => { event.preventDefault(); const gistId = document.getElementById('gistIdInput').value; const gistData = { description: document.getElementById('gistDescription').value, filename: document.getElementById('gistFilename').value, content: document.getElementById('gistContent').value }; const isEditing = !!gistId; const url = isEditing ? `/api/gists/${gistId}` : '/api/gists'; const method = isEditing ? 'PUT' : 'POST'; try { const response = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(gistData) }); if (!response.ok) throw new Error(isEditing ? '更新失败' : '创建失败'); addGistModal.hide(); fetchAndRenderGists(); } catch (error) { console.error('保存失败:', error); alert('保存失败，请检查控制台输出。'); } });
    modalElement.addEventListener('hidden.bs.modal', () => { document.getElementById('addGistModalLabel').textContent = '添加新的片段'; addGistForm.reset(); document.getElementById('gistIdInput').value = ''; fileUploadInput.value = ''; });
    fileUploadInput.addEventListener('change', (event) => { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (e) => { document.getElementById('gistContent').value = e.target.result; document.getElementById('gistFilename').value = file.name; document.getElementById('gistDescription').value = file.name; }; reader.readAsText(file); });
    
    function renderCodeBlock(gist, isExpanded = false) {
        const cleanContent = gist.content.trim();
        const totalLines = cleanContent.split('\n').length;
        const isLong = totalLines > 15;
        const displayContent = isExpanded ? cleanContent : cleanContent.split('\n').slice(0, 15).join('\n');
        const lineCount = displayContent.split('\n').length;
        let lineNumbersHtml = '';
        for (let i = 1; i <= lineCount; i++) {
            lineNumbersHtml += i + '\n';
        }
        let language = (gist.filename.split('.').pop() || 'plaintext').toLowerCase();
        if (!hljs.getLanguage(language)) {
            language = 'plaintext';
        }
        const highlightedCode = hljs.highlight(displayContent, { language: language, ignoreIllegals: true }).value;
        const finalHtml = `
            <div class="code-container">
                <pre class="line-numbers">${lineNumbersHtml}</pre>
                <pre><code>${highlightedCode}</code></pre>
            </div>
        `;
        return {
            html: finalHtml,
            isLong: isLong
        };
    }
    function escapeHTML(str) { if (!str) return ''; return str; }

    fetchAndRenderGists();
});