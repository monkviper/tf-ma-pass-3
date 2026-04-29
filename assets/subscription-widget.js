import { Component } from '@theme/component';
import { ThemeEvents } from '@theme/events';

/**
 * @typedef {Object} SubscriptionWidgetRefs
 * @property {HTMLElement} oneTimeOption - One-time purchase radio card
 * @property {HTMLElement} subscribeOption - Subscribe & save radio card
 * @property {HTMLInputElement} oneTimeRadio - One-time radio input
 * @property {HTMLInputElement} subscribeRadio - Subscribe radio input
 * @property {HTMLElement} frequencySelector - Frequency dropdown wrapper
 * @property {HTMLSelectElement} frequencySelect - Frequency select element
 * @property {HTMLElement} subscriptionPrice - Subscription price display
 * @property {HTMLElement} savingsBadge - Savings badge element
 */

/**
 * Subscription widget component for PDP buy box.
 * Toggles between one-time and subscription purchase modes,
 * manages frequency selection, and updates the product form's
 * selling_plan hidden input.
 *
 * @extends {Component<SubscriptionWidgetRefs>}
 */
class SubscriptionWidget extends Component {
  /** @type {number} Current variant price in cents */
  #currentPrice = 0;

  /** @type {number} Discount percentage for subscription */
  #discountPercent = 0;

  connectedCallback() {
    super.connectedCallback();

    this.#currentPrice = parseInt(this.dataset.currentPrice || '0', 10);
    this.#discountPercent = parseInt(this.dataset.discountPercent || '0', 10);

    const closestSection = this.closest('.shopify-section, dialog');
    if (closestSection) {
      closestSection.addEventListener(ThemeEvents.variantUpdate, this.#onVariantUpdate);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    const closestSection = this.closest('.shopify-section, dialog');
    if (closestSection) {
      closestSection.removeEventListener(ThemeEvents.variantUpdate, this.#onVariantUpdate);
    }
  }

  /**
   * Handle selecting one-time purchase mode.
   * @param {Event} event
   */
  handleOneTimeSelect(event) {
    event.preventDefault();
    this.#setMode('one-time');
  }

  /**
   * Handle selecting subscription mode.
   * @param {Event} event
   */
  handleSubscribeSelect(event) {
    event.preventDefault();
    this.#setMode('subscribe');
  }

  /**
   * Handle frequency dropdown change.
   * @param {Event} event
   */
  handleFrequencyChange(event) {
    const select = /** @type {HTMLSelectElement} */ (event.target);
    this.#updateSellingPlanInput(select.value);
  }

  /**
   * Set the purchase mode and update UI + form.
   * @param {'one-time' | 'subscribe'} mode
   */
  #setMode(mode) {
    const { oneTimeOption, subscribeOption, frequencySelector, oneTimeRadio, subscribeRadio } = this.refs;

    if (mode === 'one-time') {
      oneTimeOption?.classList.add('subscription-widget__option--active');
      subscribeOption?.classList.remove('subscription-widget__option--active');
      frequencySelector?.setAttribute('hidden', '');
      if (oneTimeRadio) oneTimeRadio.checked = true;
      if (subscribeRadio) subscribeRadio.checked = false;
      this.#updateSellingPlanInput('');
    } else {
      subscribeOption?.classList.add('subscription-widget__option--active');
      oneTimeOption?.classList.remove('subscription-widget__option--active');
      frequencySelector?.removeAttribute('hidden');
      if (subscribeRadio) subscribeRadio.checked = true;
      if (oneTimeRadio) oneTimeRadio.checked = false;

      const { frequencySelect } = this.refs;
      const sellingPlanId = frequencySelect?.value || '';
      this.#updateSellingPlanInput(sellingPlanId);
    }
  }

  /**
   * Update or create the selling_plan hidden input in the product form.
   * @param {string} sellingPlanId
   */
  #updateSellingPlanInput(sellingPlanId) {
    const form = this.#findProductForm();
    if (!form) return;

    let input = /** @type {HTMLInputElement | null} */ (form.querySelector('input[name="selling_plan"]'));

    if (sellingPlanId) {
      if (!input) {
        input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'selling_plan';
        form.appendChild(input);
      }
      input.value = sellingPlanId;
    } else if (input) {
      input.value = '';
    }
  }

  /**
   * Find the product form element.
   * Traverses up to the closest shopify-section and queries for the form.
   * @returns {HTMLFormElement | null}
   */
  #findProductForm() {
    const section = this.closest('.shopify-section');
    if (!section) return null;

    const formComponent = section.querySelector('product-form-component');
    if (formComponent) {
      return formComponent.querySelector('form[action*="/cart/add"]');
    }

    return section.querySelector('form[action*="/cart/add"]');
  }

  /**
   * Handle variant update events to recalculate subscription price.
   * @param {import('./events').VariantUpdateEvent} event
   */
  #onVariantUpdate = (event) => {
    const variant = event.detail.resource;
    if (!variant) return;

    const newPrice = variant.price;
    if (newPrice != null) {
      this.#currentPrice = newPrice;
      this.dataset.currentPrice = String(newPrice);
      this.#updateSubscriptionPriceDisplay();
    }
  };

  /**
   * Update the subscription price display based on current variant price and discount.
   */
  #updateSubscriptionPriceDisplay() {
    const { subscriptionPrice } = this.refs;
    if (!subscriptionPrice) return;

    const discountedPrice = Math.round(this.#currentPrice * (1 - this.#discountPercent / 100));
    const formatted = this.#formatMoney(discountedPrice);
    subscriptionPrice.textContent = formatted;
  }

  /**
   * Format a price in cents to a money string.
   * @param {number} cents
   * @returns {string}
   */
  #formatMoney(cents) {
    const amount = (cents / 100).toFixed(2);
    const moneyFormat = this.dataset.moneyFormat || '${{amount}}';
    return moneyFormat.replace('{{amount}}', amount).replace('{{amount_no_decimals}}', String(Math.round(cents / 100)));
  }
}

if (!customElements.get('subscription-widget-component')) {
  customElements.define('subscription-widget-component', SubscriptionWidget);
}
