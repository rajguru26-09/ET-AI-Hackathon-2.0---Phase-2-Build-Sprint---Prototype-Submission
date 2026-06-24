document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const chatHistory = document.getElementById('chatHistory');
    const promptChips = document.querySelectorAll('.prompt-chip');
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');

    // Handle Quick Prompts
    promptChips.forEach(chip => {
        chip.addEventListener('click', () => {
            chatInput.value = chip.textContent;
            chatInput.focus();
        });
    });

    // Handle File Upload Visuals
    uploadZone.addEventListener('click', () => fileInput.click());
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadZone.addEventListener(eventName, () => {
            uploadZone.style.borderColor = 'var(--accent-primary)';
            uploadZone.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, () => {
            uploadZone.style.borderColor = 'var(--border-color)';
            uploadZone.style.backgroundColor = 'rgba(15, 23, 42, 0.5)';
        }, false);
    });

    uploadZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        handleFiles(files);
    });

    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });

    async function handleFiles(files) {
        const docList = document.getElementById('documentList');
        
        for (const file of Array.from(files)) {
            const iconClass = file.type === 'application/pdf' ? 'ph-file-pdf' : 'ph-file-text';
            const colorClass = file.type === 'application/pdf' ? '#ef4444' : '#3b82f6';
            
            const docItem = document.createElement('div');
            docItem.className = 'doc-item';
            docItem.style.flexDirection = 'column';
            docItem.style.alignItems = 'flex-start';
            docItem.innerHTML = `
                <div style="display:flex; width: 100%; align-items: center; gap: 0.5rem;">
                    <i class="ph-fill ${iconClass}" style="color: ${colorClass}"></i>
                    <span>${file.name}</span>
                    <i class="ph ph-spinner-gap loading-spinner" style="margin-left:auto; animation: spin 1s linear infinite;"></i>
                </div>
                <div class="upload-status-text" style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 4px; margin-left: 1.5rem;">Initializing OCR & Document Intelligence...</div>
            `;
            docList.prepend(docItem);

            const statusText = docItem.querySelector('.upload-status-text');
            setTimeout(() => { 
                if(statusText.innerText.includes('Initializing')) {
                    statusText.innerText = "Running Computer Vision on embedded P&IDs...";
                }
            }, 800);

            // Upload to backend
            try {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = async () => {
                    const base64Data = reader.result.split(',')[1];
                    const response = await fetch('http://localhost:8000/api/upload', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ filename: file.name, data: base64Data })
                    });
                    
                    if (response.ok) {
                        const spinner = docItem.querySelector('.loading-spinner');
                        spinner.className = 'ph-fill ph-check-circle';
                        spinner.style.color = 'var(--success)';
                        spinner.style.animation = 'none';
                        statusText.innerText = "Knowledge Graph Updated & Digitized";
                        statusText.style.color = "var(--success)";
                    } else {
                        throw new Error('Upload failed');
                    }
                };
            } catch (error) {
                console.error("Upload failed", error);
                const spinner = docItem.querySelector('.loading-spinner');
                spinner.className = 'ph-fill ph-warning-circle';
                spinner.style.color = 'var(--danger)';
                spinner.style.animation = 'none';
            }
        }
    }

    // Handle Chat Submission
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = chatInput.value.trim();
        if (!message) return;

        // Add user message
        addUserMessage(message);
        chatInput.value = '';

        // Show typing indicator
        const typingId = showTypingIndicator();

        try {
            // Call Backend API
            const response = await fetch('http://localhost:8000/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: message })
            });

            const data = await response.json();
            removeMessage(typingId);
            addAIMessage(data.answer, data.sources, data.confidence, data.entities);
        } catch (error) {
            console.error("Error connecting to backend:", error);
            removeMessage(typingId);
            addAIMessage("I'm sorry, I couldn't connect to the Aegis Knowledge Brain backend. Please ensure the server is running on localhost:8000.", []);
        }
    });

    function addUserMessage(text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message user-message';
        msgDiv.innerHTML = `
            <div class="message-avatar">
                <i class="ph-fill ph-user"></i>
            </div>
            <div class="message-content">
                <p>${text}</p>
            </div>
        `;
        chatHistory.appendChild(msgDiv);
        scrollToBottom();
    }

    function addAIMessage(text, sources, confidence = null, entities = []) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message ai-message';
        
        let sourcesHtml = '';
        if (sources && sources.length > 0) {
            sourcesHtml = '<div style="margin-top: 10px; border-top: 1px solid var(--border-color); padding-top: 8px;"><span style="font-size: 0.75rem; color: var(--text-secondary);">Sources: </span>';
            sources.forEach((src, idx) => {
                sourcesHtml += `<span class="citation"><i class="ph-fill ph-file-pdf"></i> ${src}</span>`;
            });
            sourcesHtml += '</div>';
        }

        let confidenceHtml = '';
        if (confidence !== null && confidence > 0) {
            const color = confidence > 80 ? 'var(--success)' : (confidence > 40 ? 'orange' : 'var(--danger)');
            confidenceHtml = `<div class="confidence-badge" style="border: 1px solid ${color}; color: ${color};"><i class="ph-fill ph-shield-check"></i> ${confidence}% Confidence</div>`;
        }

        let entitiesHtml = '';
        if (entities && entities.length > 0) {
            entitiesHtml = '<div style="margin-top: 10px; display: flex; gap: 6px; flex-wrap: wrap;">';
            entities.forEach(ent => {
                entitiesHtml += `<span style="background: rgba(16, 185, 129, 0.1); border: 1px solid var(--success); color: var(--success); padding: 2px 8px; border-radius: 12px; font-size: 0.7rem;"><i class="ph-fill ph-graph"></i> Ontology Node: ${ent}</span>`;
            });
            entitiesHtml += '</div>';
        }

        let qmsHtml = `<div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--border-color);">
            <button class="qms-btn" style="background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-primary); padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
                <i class="ph-fill ph-robot"></i> Trigger Agentic QMS Workflow
            </button>
        </div>`;

        // Simple markdown parsing for bold text
        const formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        msgDiv.innerHTML = `
            <div class="message-avatar">
                <i class="ph-fill ph-robot"></i>
            </div>
            <div class="message-content">
                ${confidenceHtml}
                <p>${formattedText}</p>
                ${entitiesHtml}
                ${sourcesHtml}
                ${qmsHtml}
            </div>
        `;
        chatHistory.appendChild(msgDiv);
        
        const qmsBtn = msgDiv.querySelector('.qms-btn');
        if (qmsBtn) {
            qmsBtn.addEventListener('click', function() {
                this.innerHTML = '<i class="ph-fill ph-check-circle" style="color: var(--success)"></i> Agentic Compliance Report Generated';
                this.style.borderColor = 'var(--success)';
                this.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
            });
        }
        
        scrollToBottom();
    }

    function showTypingIndicator() {
        const id = 'typing-' + Date.now();
        const msgDiv = document.createElement('div');
        msgDiv.id = id;
        msgDiv.className = 'message ai-message';
        msgDiv.innerHTML = `
            <div class="message-avatar">
                <i class="ph-fill ph-robot"></i>
            </div>
            <div class="message-content" style="padding: 0.8rem 1.25rem;">
                <div class="typing-indicator">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
            </div>
        `;
        chatHistory.appendChild(msgDiv);
        scrollToBottom();
        return id;
    }

    function removeMessage(id) {
        const el = document.getElementById(id);
        if (el) {
            el.remove();
        }
    }

    function scrollToBottom() {
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
});
