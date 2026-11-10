document.addEventListener('DOMContentLoaded', function() {
    const container = document.querySelector('.icaviet-form-container');
    if (!container) return;

    const form = document.getElementById('icaviet-dynamic-form');
    if (!form) return;

    const formSlug = container.getAttribute('data-form');
    let currentLang = 'vi'; // Default

    // 1. Language Toggle
    const langButtons = document.querySelectorAll('.lang-toggle');
    langButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            currentLang = this.getAttribute('data-lang');
            updateLanguage();
            
            // Highlight active button
            langButtons.forEach(b => {
                if (b === this) {
                    b.classList.replace('bg-gray-200', 'bg-blue-600');
                    b.classList.replace('text-gray-700', 'text-white');
                } else {
                    b.classList.replace('bg-blue-600', 'bg-gray-200');
                    b.classList.replace('text-white', 'text-gray-700');
                }
            });
        });
    });

    function updateLanguage() {
        document.querySelectorAll('.lang-text').forEach(el => {
            const text = el.getAttribute(`data-${currentLang}`);
            if (text) el.textContent = text;
        });
    }

    // 2. Repeatable Fields
    document.querySelectorAll('.repeatable-wrapper').forEach(wrapper => {
        const btnAdd = wrapper.querySelector('.btn-add-item');
        const container = wrapper.querySelector('.items-container');
        const template = wrapper.querySelector('.item-template');
        const fieldName = wrapper.getAttribute('data-field-name');

        if (!btnAdd || !template || !container) return;

        let itemCount = 0;

        btnAdd.addEventListener('click', () => {
            const clone = template.content.cloneNode(true);
            const itemDiv = clone.querySelector('.repeatable-item');
            
            // Update input names so they can be collected properly
            const inputs = itemDiv.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                const subName = input.getAttribute('data-name');
                input.name = `${fieldName}[${itemCount}][${subName}]`;
            });

            // Remove button
            const btnRemove = itemDiv.querySelector('.btn-remove-item');
            if (btnRemove) {
                btnRemove.addEventListener('click', function() {
                    itemDiv.remove();
                });
            }

            container.appendChild(itemDiv);
            itemCount++;
        });

        // Add one empty item by default
        btnAdd.click();
    });

    // 3. Signature Pad
    const canvas = document.getElementById('signature-pad');
    const btnClear = document.getElementById('clear-signature');
    const signatureInput = document.getElementById('signature-data');
    let signaturePad = null; // Hoist de tranh scope error
    
    if (canvas && typeof SignaturePad !== 'undefined') {
        signaturePad = new SignaturePad(canvas, {
            backgroundColor: 'rgba(255, 255, 255, 0)',
            penColor: 'rgb(0, 0, 0)'
        });

        function resizeCanvas() {
            const ratio =  Math.max(window.devicePixelRatio || 1, 1);
            canvas.width = canvas.offsetWidth * ratio;
            canvas.height = canvas.offsetHeight * ratio;
            canvas.getContext("2d").scale(ratio, ratio);
            signaturePad.clear(); // otherwise drawing will be distorted
        }

        window.addEventListener("resize", resizeCanvas);
        resizeCanvas();

        btnClear.addEventListener('click', function() {
            signaturePad.clear();
            signatureInput.value = '';
        });

        signaturePad.addEventListener("endStroke", () => {
            signatureInput.value = signaturePad.toDataURL("image/png");
        });
    }

    // 4. Form Submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        // Clear previous error highlights
        form.querySelectorAll('.border-red-500').forEach(el => {
            el.classList.remove('border-red-500', 'focus:ring-red-500', 'ring-1', 'ring-red-500');
        });

        // Check if signature is empty
        if (!signatureInput.value) {
            alert(currentLang === 'vi' ? 'Vui lòng ký tên!' : 'Please sign your name!');
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="lang-text">Processing...</span>';

        // Collect data
        const formData = new FormData(form);
        const dataObj = {
            language: currentLang,
            form_data: {}
        };

        // Parse form data into nested object
        for (let [key, value] of formData.entries()) {
            // Handle array notation fieldName[index][subName]
            const arrayMatch = key.match(/^([^\[]+)\[(\d+)\]\[([^\]]+)\]$/);
            if (arrayMatch) {
                const parent = arrayMatch[1];
                const index = arrayMatch[2];
                const sub = arrayMatch[3];
                
                if (!dataObj.form_data[parent]) dataObj.form_data[parent] = [];
                if (!dataObj.form_data[parent][index]) dataObj.form_data[parent][index] = {};
                dataObj.form_data[parent][index][sub] = value;
            } else if (key === 'applicant_full_name' || key === 'applicant_signature') {
                dataObj[key] = value;
            } else {
                dataObj.form_data[key] = value;
            }
        }

        // Clean up sparse arrays
        for (const key in dataObj.form_data) {
            if (Array.isArray(dataObj.form_data[key])) {
                dataObj.form_data[key] = dataObj.form_data[key].filter(i => i);
            }
        }

        // Add necessary fields for backend validation to top level (to match handler requirements)
        dataObj.applicant_full_name = dataObj.applicant_full_name || '';
        dataObj.applicant_signature = dataObj.applicant_signature || '';
        dataObj.customer_name = dataObj.applicant_full_name;
        dataObj.customer_email = dataObj.form_data.email || '';
        dataObj.customer_phone = dataObj.form_data.phone || '';

        // API Call
        const apiUrl = (window.icavietData && window.icavietData.apiUrl) ? window.icavietData.apiUrl : '/wp-json/ICAVIET/v1';
        const nonce = (window.icavietData && window.icavietData.nonce) ? window.icavietData.nonce : '';

        fetch(`${apiUrl}/submit/${formSlug}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': nonce
            },
            body: JSON.stringify(dataObj)
        })
        .then(res => res.json())
        .then(res => {
            const msgBox = document.getElementById('form-message');
            msgBox.classList.remove('hidden');
            
            if (res.success || res.ok) {
                msgBox.classList.add('bg-green-100', 'text-green-800');
                msgBox.classList.remove('bg-red-100', 'text-red-800');
                msgBox.innerHTML = currentLang === 'vi' 
                    ? '<strong>Thành công!</strong> Cảm ơn bạn đã gửi thông tin.' 
                    : '<strong>Success!</strong> Thank you for submitting.';
                form.reset();
                if (signaturePad) signaturePad.clear();
            } else {
                let errorMessage = res.message;
                if (res.errors && typeof res.errors === 'object') {
                    const errorList = Object.values(res.errors).map(msg => `&bull; ${msg}`).join('<br>');
                    errorMessage = (currentLang === 'vi' ? 'Vui lòng kiểm tra lại:' : 'Please check your input:') + '<br>' + errorList;
                    
                    // Highlight invalid fields
                    for (const key of Object.keys(res.errors)) {
                        // Tim input truc tiep theo name
                        let inputs = form.querySelectorAll(`[name="${key}"], [name="${key}[]"]`);
                        // Neu khong tim thay, thu tim trong form_data scope (schema-rendered forms)
                        if (inputs.length === 0) {
                            inputs = form.querySelectorAll(`[name="form_data[${key}]"], [name="${key}"]`);
                        }
                        inputs.forEach(input => {
                            input.classList.add('border-red-500', 'focus:ring-red-500', 'ring-1', 'ring-red-500');
                        });
                    }
                }
                throw new Error(errorMessage || 'Lỗi hệ thống / System error');
            }
        })
        .catch(err => {
            const msgBox = document.getElementById('form-message');
            msgBox.classList.remove('hidden');
            msgBox.classList.add('bg-red-100', 'text-red-800');
            msgBox.classList.remove('bg-green-100', 'text-green-800');
            
            let displayMessage = err.message;
            if (displayMessage.includes('JSON') || displayMessage.includes('Unexpected token')) {
                displayMessage = 'Lỗi hệ thống / System error';
            }
            
            msgBox.innerHTML = `<strong>Lỗi / Error:</strong> <br>${displayMessage}`;
            console.error('Submit error:', err);
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        });
    });

    // 5. Remove error highlights on input/change
    form.addEventListener('input', function(e) {
        if (e.target.classList && e.target.classList.contains('border-red-500')) {
            e.target.classList.remove('border-red-500', 'focus:ring-red-500', 'ring-1', 'ring-red-500');
        }
    });
    form.addEventListener('change', function(e) {
        if (e.target.classList && e.target.classList.contains('border-red-500')) {
            e.target.classList.remove('border-red-500', 'focus:ring-red-500', 'ring-1', 'ring-red-500');
        }
    });
});
