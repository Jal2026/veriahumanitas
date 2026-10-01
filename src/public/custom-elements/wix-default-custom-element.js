const _createClass = (function () {
  function defineProperties(target, props) {
    for (let i = 0; i < props.length; i++) {
      const descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ('value' in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }
  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
})();

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError('Cannot call a class as a function');
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError(
      "this hasn't been initialised - super() hasn't been called",
    );
  }
  return call && (typeof call === 'object' || typeof call === 'function')
    ? call
    : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== 'function' && superClass !== null) {
    throw new TypeError(
      'Super expression must either be null or a function, not ' +
        typeof superClass,
    );
  }
  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true,
    },
  });
  if (superClass)
    Object.setPrototypeOf
      ? Object.setPrototypeOf(subClass, superClass)
      : (subClass.__proto__ = superClass);
}

// To debug this code, open wixDefaultCustomElement.js in Developer Tools.

const IMAGE_URL = 'https://wix.to/vUBXBKU';
const H2_TEXT = 'This is a Custom Element (Velo)';
const H3_1_TEXT =
  'View its code by selecting its Velo file in the Site Structure.';
const H3_2_TEXT =
  'Explore this code and use it as a reference to create your own element.';
const DEBUG_TEXT =
  "Loading the code for Custom Element 'wix-default-custom-element'. To debug this code, open wixDefaultCustomElement.js in Developer Tools.";

const createImage = function createImage() {
  const imageElement = document.createElement('img');
  imageElement.src = IMAGE_URL;
  imageElement.id = 'wdce-image';
  return imageElement;
};

const createH2 = function createH2() {
  const h2Element = document.createElement('h2');
  h2Element.textContent = H2_TEXT;
  h2Element.id = 'wdce-h2';
  return h2Element;
};

const createH3 = function createH3(id, text) {
  const h3Element = document.createElement('h3');
  h3Element.id = id;
  h3Element.textContent = text;
  return h3Element;
};

const createTextContainer = function createTextContainer() {
  const textContainer = document.createElement('div');
  textContainer.id = 'wdce-text-container';
  textContainer.appendChild(createH2());
  textContainer.appendChild(createH3('wdce-h3-1', H3_1_TEXT));
  textContainer.appendChild(createH3('wdce-h3-2', H3_2_TEXT));
  return textContainer;
};

const createImageContainer = function createImageContainer() {
  const imageContainer = document.createElement('div');
  imageContainer.id = 'wdce-image-container';
  imageContainer.appendChild(createImage());
  return imageContainer;
};

const createStyle = function createStyle() {
  const styleElement = document.createElement('style');
  styleElement.innerHTML =
    "\n    wix-default-custom-element {\n        background-color: #f0f4f7;\n        display: flex;\n        height: 100%;\n        height: -moz-available;\n        height: -webkit-fill-available;\n        width: 100%;\n        justify-content: center;\n      }\n\n    #wdce-image-container {\n        width: 35%;\n        max-width: 165px;\n        display: flex;\n        margin: 0 20px 0 30px;\n        overflow: hidden;\n    }\n\n    #wdce-image {\n        width: 100%;\n        min-width: 100px;\n    }\n\n    #wdce-text-container {\n        display: flex;\n        flex-direction: column;\n        width: 65%;\n        justify-content: center;\n        max-width: 314px;\n        min-width: 200px;\n    }\n\n    #wdce-h2 {\n        font-family: 'HelveticaNeueW01-45Ligh, HelveticaNeueW02-45Ligh, HelveticaNeueW10-45Ligh, Helvetica Neue, Helvetica, Arial, メイリオ, meiryo, ヒラギノ角ゴ pro w3, hiragino kaku gothic pro, sans-serif',\n        font-size: 16px;\n        font-weight: 500;\n        letter-spacing: 0.89px;\n        color: #32536a;\n        margin: 0 0 16px 0;\n    }\n\n    #wdce-h3-1, #wdce-h3-2 {\n        font-family: 'HelveticaNeueW01-45Ligh, HelveticaNeueW02-45Ligh, HelveticaNeueW10-45Ligh, Helvetica Neue, Helvetica, Arial, メイリオ, meiryo, ヒラギノ角ゴ pro w3, hiragino kaku gothic pro, sans-serif',\n        font-size: 14px;\n        font-weight: 300;\n        line-height: 1.43;\n        color: #162d3d;\n        margin: 0 0 8px 0;\n    }\n    ";
  return styleElement;
};

const WixDefaultCustomElement = (function (_HTMLElement) {
  _inherits(WixDefaultCustomElement, _HTMLElement);

  // eslint-disable-next-line no-shadow
  function WixDefaultCustomElement() {
    _classCallCheck(this, WixDefaultCustomElement);

    const _this = _possibleConstructorReturn(
      this,
      (
        WixDefaultCustomElement.__proto__ ||
        Object.getPrototypeOf(WixDefaultCustomElement)
      ).call(this),
    );

    // eslint-disable-next-line no-console
    console.log(DEBUG_TEXT);
    return _this;
  }

  _createClass(WixDefaultCustomElement, [
    {
      key: 'connectedCallback',
      value: function connectedCallback() {
        this.appendChild(createStyle());
        this.appendChild(createImageContainer());
        this.appendChild(createTextContainer());
      },
    },
  ]);

  return WixDefaultCustomElement;
})(HTMLElement);

customElements.define('wix-default-custom-element', WixDefaultCustomElement);
