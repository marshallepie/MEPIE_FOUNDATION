/**
 * Form Validation and Handling
 * MEPIE Foundation
 */

export function initForms() {
  const forms = document.querySelectorAll('form[data-validate]');

  forms.forEach(form => {
    form.addEventListener('submit', handleSubmit);

    // Real-time validation
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.addEventListener('blur', () => validateField(input));
      input.addEventListener('input', () => {
        if (input.classList.contains('error')) {
          validateField(input);
        }
      });
    });
  });
}

function handleSubmit(e) {
  const form = e.target;
  const inputs = form.querySelectorAll('[required]');
  let isValid = true;

  inputs.forEach(input => {
    if (!validateField(input)) {
      isValid = false;
    }
  });

  if (!isValid) {
    e.preventDefault();
    const firstError = form.querySelector('.form-group.error input, .form-group.error textarea');
    if (firstError) {
      firstError.focus();
    }
  }
}

function validateField(input) {
  const formGroup = input.closest('.form-group');
  if (!formGroup) return true;

  // Clear previous error
  formGroup.classList.remove('error', 'success');
  const existingError = formGroup.querySelector('.form-error');
  if (existingError) {
    existingError.remove();
  }

  // Check if field is required and empty
  if (input.hasAttribute('required') && !input.value.trim()) {
    showError(formGroup, input, 'This field is required');
    return false;
  }

  // Email validation
  if (input.type === 'email' && input.value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.value)) {
      showError(formGroup, input, 'Please enter a valid email address');
      return false;
    }
  }

  // Phone validation (basic)
  if (input.type === 'tel' && input.value) {
    const phoneRegex = /^[0-9\s\-\+\(\)]+$/;
    if (!phoneRegex.test(input.value) || input.value.replace(/\D/g, '').length < 10) {
      showError(formGroup, input, 'Please enter a valid phone number');
      return false;
    }
  }

  // URL validation
  if (input.type === 'url' && input.value) {
    try {
      new URL(input.value);
    } catch {
      showError(formGroup, input, 'Please enter a valid URL');
      return false;
    }
  }

  // Min length validation
  if (input.hasAttribute('minlength')) {
    const minLength = parseInt(input.getAttribute('minlength'));
    if (input.value.length < minLength) {
      showError(formGroup, input, `Must be at least ${minLength} characters`);
      return false;
    }
  }

  // Max length validation
  if (input.hasAttribute('maxlength')) {
    const maxLength = parseInt(input.getAttribute('maxlength'));
    if (input.value.length > maxLength) {
      showError(formGroup, input, `Must not exceed ${maxLength} characters`);
      return false;
    }
  }

  // Pattern validation
  if (input.hasAttribute('pattern') && input.value) {
    const pattern = new RegExp(input.getAttribute('pattern'));
    if (!pattern.test(input.value)) {
      const patternMessage = input.getAttribute('data-pattern-message') || 'Invalid format';
      showError(formGroup, input, patternMessage);
      return false;
    }
  }

  // If we get here, field is valid
  if (input.value.trim()) {
    formGroup.classList.add('success');
  }
  return true;
}

function showError(formGroup, input, message) {
  formGroup.classList.add('error');

  const errorEl = document.createElement('span');
  errorEl.className = 'form-error';
  errorEl.textContent = message;

  input.parentElement.appendChild(errorEl);
}

// Form submission success message
export function showFormSuccess(form, message = 'Thank you! Your message has been sent.') {
  const successDiv = document.createElement('div');
  successDiv.className = 'alert alert-success';
  successDiv.textContent = message;

  form.insertAdjacentElement('beforebegin', successDiv);
  form.reset();

  // Scroll to success message
  successDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Remove success message after 5 seconds
  setTimeout(() => {
    successDiv.remove();
  }, 5000);
}
