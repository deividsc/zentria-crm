/**
 * Zentria Landing Page - Tracking & Form Handling
 */

(function() {
    'use strict';

    // =============================================
    // Configuration
    // =============================================
    const CONFIG = {
        webhookUrl: 'http://136.115.7.41/webhook/lead-capture',
        trackingPrefix: 'zentria_landing_'
    };

    // =============================================
    // UTM Tracking
    // =============================================
    function captureUTM() {
        const utmParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
        const utmData = {};
        
        utmParams.forEach(param => {
            const value = new URLSearchParams(window.location.search).get(param);
            if (value) {
                utmData[param] = value;
                document.getElementById(param)?.setAttribute('value', value);
            }
        });
        
        return utmData;
    }

    function captureSection( sectionId ) {
        document.getElementById('seccion_origen')?.setAttribute('value', sectionId);
        return sectionId;
    }

    // =============================================
    // Tracking Events
    // =============================================
    function trackEvent(action, properties = {}) {
        const event = {
            event: CONFIG.trackingPrefix + action,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            ...properties
        };
        
        console.log('[Zentria Tracking]', event);
        
        // Store for form submission
        window.__zentriaTracking = window.__zentriaTracking || {};
        window.__zentriaTracking[action] = event;
        
        return event;
    }

    // Track button clicks
    function setupTracking() {
        document.querySelectorAll('[data-track]').forEach(el => {
            el.addEventListener('click', function(e) {
                const action = this.getAttribute('data-track');
                const plan = this.getAttribute('data-plan') || null;
                const section = this.closest('[data-section]')?.getAttribute('data-section') || 'unknown';
                
                trackEvent('click', {
                    action: action,
                    plan: plan,
                    section: section,
                    element: this.tagName
                });
            });
        });

        // Track section visibility
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const section = entry.target.getAttribute('data-section');
                    trackEvent('section_view', {
                        section: section,
                        percentVisible: Math.round(entry.intersectionRatio * 100)
                    });
                }
            });
        }, { threshold: 0.5 });

        document.querySelectorAll('[data-section]').forEach(section => {
            observer.observe(section);
        });
    }

    // =============================================
    // Form Submission
    // =============================================
    async function submitForm(form, formType) {
        const formData = new FormData(form);
        const data = {
            form_type: formType,
            timestamp: new Date().toISOString(),
            source_url: window.location.href
        };

        // Get UTM parameters
        const utmData = captureUTM();
        Object.assign(data, utmData);

        // Add form fields
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }

        // Add tracking events
        const allTracking = Object.values(window.__zentriaTracking || {});
        data.tracking_events = allTracking;

        console.log('[Zentria] Submitting form:', data);

        try {
            // Send to n8n webhook
            const response = await fetch(CONFIG.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data),
                mode: 'no-cors' // n8n webhook doesn't support CORS preflight
            });

            showNotification('¡Gracias por tu mensaje! Te contactaremos pronto.', 'success');
            form.reset();
            
            trackEvent('form_submit_success', { formType: formType });
            
        } catch (error) {
            console.error('[Zentria] Form submission error:', error);
            showNotification('Hubo un error. Por favor intenta nuevamente.', 'error');
            trackEvent('form_submit_error', { formType: formType, error: error.message });
        }
    }

    // =============================================
    // Notifications
    // =============================================
    function showNotification(message, type = 'info') {
        // Remove existing notification
        const existing = document.querySelector('.zentria-notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = `zentria-notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">×</button>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            padding: 16px 24px;
            border-radius: 8px;
            background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#2563eb'};
            color: white;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
            z-index: 9999;
            animation: slideIn 0.3s ease-out;
        `;
        
        notification.querySelector('button').style.cssText = `
            background: none;
            border: none;
            color: white;
            font-size: 1.5rem;
            cursor: pointer;
            opacity: 0.8;
        `;
        
        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => notification.remove(), 5000);
    }

    // =============================================
    // Initialize
    // =============================================
    function init() {
        console.log('[Zentria] Landing page initialized');
        
        // Capture UTM parameters
        captureUTM();
        
        // Setup tracking
        setupTracking();
        
        // Setup form handlers
        document.querySelectorAll('form[data-form-type]').forEach(form => {
            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                const formType = this.getAttribute('data-form-type');
                await submitForm(this, formType);
            });
        });

        // Track page view
        trackEvent('page_view', {
            path: window.location.pathname,
            referrer: document.referrer
        });
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
