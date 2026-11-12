/**
 * Abdullah Rikhash — Cinematic Digital Profile
 * NFC Landing Interaction Script
 */

(function () {
  'use strict';

  // Client Data Configuration (Strictly as specified)
  const PROFILE_DATA = {
    name: 'Abdullah Rikhash',
    firstName: 'Abdullah',
    lastName: 'Rikhash',
    role: 'Entrepreneur',
    location: 'Calicut, Kerala',
    city: 'Calicut',
    state: 'Kerala',
    country: 'India',
    phone: '+918891456003',
    phoneDisplay: '+91 88914 56003',
    email: 'abdhullarikhash@gmail.com',
    instagram: 'https://www.instagram.com/abdhullarikhash',
    org: 'Taptch / Syncmie / Event Bay / BrainBay Consultancy',
    companyShort: 'Taptch / Syncmie',
    note: 'Ventures: Taptch (Founder), Syncmie (Founder), Event Bay (Co-Founder), BrainBay Consultancy (Business Executive)'
  };

  // UPI Payment Configuration
  const UPI_PAY_URL = "upi://pay?pa=rikhashp@okaxis&pn=" + encodeURIComponent("Abdullah Rikhash") + "&cu=INR";
  const UPI_ID = "rikhashp@okaxis";

  // DOM Elements
  const introOverlay = document.getElementById('intro-overlay');
  const introSkipBtn = document.getElementById('intro-skip-btn');
  const btnSaveContact = document.getElementById('btn-save-contact');
  const saveContactHint = document.getElementById('save-contact-hint');
  const btnShare = document.getElementById('btn-share');
  const payUpiBtn = document.getElementById('pay-upi-btn');
  const upiSheetBtn = document.getElementById('upi-sheet-btn');
  const toastEl = document.getElementById('toast');
  const toastMessageEl = document.getElementById('toast-message');

  // UPI Modal DOM Elements
  const upiModal = document.getElementById('upi-modal');
  const upiModalBackdrop = document.getElementById('upi-modal-backdrop');
  const upiModalClose = document.getElementById('upi-modal-close');
  const upiQrContainer = document.getElementById('upi-qr-container');
  const btnCopyUpi = document.getElementById('btn-copy-upi');
  const btnCopyUpiText = document.getElementById('btn-copy-upi-text');

  let toastTimeout = null;
  let introTimer = null;
  let isIntroSkipped = false;
  let isQrGenerated = false;

  /**
   * Display accessible toast message
   */
  function showToast(message, duration = 3000) {
    if (!toastEl || !toastMessageEl) return;
    toastMessageEl.textContent = message;
    toastEl.classList.add('toast-active');
    toastEl.setAttribute('aria-hidden', 'false');

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastEl.classList.remove('toast-active');
      toastEl.setAttribute('aria-hidden', 'true');
    }, duration);
  }

  /**
   * Complete / Settle the Intro Sequence
   */
  function completeIntro(immediate = false) {
    if (isIntroSkipped) return;
    isIntroSkipped = true;

    if (introTimer) clearTimeout(introTimer);

    try {
      sessionStorage.setItem('rikash_intro_seen', 'true');
    } catch (e) {
      // Ignore storage access restrictions
    }

    if (!introOverlay) {
      document.body.classList.add('intro-settled');
      return;
    }

    if (immediate) {
      introOverlay.classList.add('curtain-open', 'intro-dismissed');
      introOverlay.style.display = 'none';
      document.body.classList.add('intro-settled');
      return;
    }

    introOverlay.classList.add('curtain-open');
    document.body.classList.add('intro-settled');

    setTimeout(() => {
      introOverlay.classList.add('intro-dismissed');
      setTimeout(() => {
        introOverlay.style.display = 'none';
      }, 600);
    }, 900);
  }

  /**
   * Initialize Opening Sequence
   */
  function initIntroSequence() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasSeenIntro = sessionStorage.getItem('rikash_intro_seen') === 'true';

    if (prefersReducedMotion || hasSeenIntro) {
      completeIntro(true);
      return;
    }

    if (introOverlay) {
      introOverlay.addEventListener('click', () => completeIntro(false), { once: true });
    }
    if (introSkipBtn) {
      introSkipBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        completeIntro(false);
      }, { once: true });
    }

    window.addEventListener('keydown', (e) => {
      if (['Escape', ' ', 'Enter'].includes(e.key) && !isIntroSkipped) {
        completeIntro(false);
      }
    });

    introTimer = setTimeout(() => {
      completeIntro(false);
    }, 2250);
  }

  /**
   * Save Contact: navigate directly to static vCard file on every device.
   * On Android, display a quiet 6s hint instructing to tap Open on the download.
   */
    let hintTimer = null;

  function handleSaveContact() {
    const ua = navigator.userAgent || '';
    const isAndroid = /Android/i.test(ua);

      if (isAndroid && saveContactHint) {
        if (hintTimer) clearTimeout(hintTimer);
        saveContactHint.classList.add('is-visible');
        hintTimer = setTimeout(() => {
          saveContactHint.classList.remove('is-visible');
        }, 6000);
      }

        window.location.href = '/abdul-rikash.vcf';
      }

    /**
     * Share Profile Link
     */
    async function shareProfile() {
      const shareData = {
        title: `${PROFILE_DATA.name} — ${PROFILE_DATA.role}`,
        text: `${PROFILE_DATA.name} · ${PROFILE_DATA.role} · ${PROFILE_DATA.location}`,
        url: window.location.href
      };

      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
          return;
        } catch (err) {
          if (err.name === 'AbortError') return;
        }
      }

      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(window.location.href);
          showToast('Profile link copied to clipboard');
        } else {
          const textarea = document.createElement('textarea');
          textarea.value = window.location.href;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          showToast('Profile link copied to clipboard');
        }
      } catch (copyErr) {
        showToast('Could not copy link');
      }
    }

    // ==========================================================================
    // BUNDLED STANDALONE QR CODE GENERATOR (Kazuhiko Arase Algorithm)
    // Client-side, zero CDN, generates black on white SVG with quiet zone
    // ==========================================================================
    function createQrSvg(text) {
      function QRCode(typeNumber, errorCorrectionLevel) {
        this.typeNumber = typeNumber;
        this.errorCorrectionLevel = errorCorrectionLevel;
        this.modules = null;
        this.moduleCount = 0;
        this.dataCache = null;
        this.dataList = [];
      }

      QRCode.prototype = {
        addData: function (data) {
          this.dataList.push(new QR8bitByte(data));
          this.dataCache = null;
        },
        isDark: function (row, col) {
          return this.modules[row][col];
        },
        getModuleCount: function () {
          return this.moduleCount;
        },
        make: function () {
          var typeNumber = 1;
          for (typeNumber = 1; typeNumber < 40; typeNumber++) {
            var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, this.errorCorrectionLevel);
            var buffer = new QRBitBuffer();
            var totalDataCount = 0;
            for (var i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
            for (var i = 0; i < this.dataList.length; i++) {
              var d = this.dataList[i];
              buffer.put(d.mode, 4);
              buffer.put(d.getLength(), QRUtil.getLengthInBits(d.mode, typeNumber));
              d.write(buffer);
            }
            if (buffer.getLengthInBits() <= totalDataCount * 8) break;
          }
          this.typeNumber = typeNumber;
          this.makeImpl(false, this.getBestMaskPattern());
        },
        makeImpl: function (test, maskPattern) {
          this.moduleCount = this.typeNumber * 4 + 17;
          this.modules = new Array(this.moduleCount);
          for (var row = 0; row < this.moduleCount; row++) {
            this.modules[row] = new Array(this.moduleCount);
            for (var col = 0; col < this.moduleCount; col++) this.modules[row][col] = null;
          }
          this.setupPositionProbePattern(0, 0);
          this.setupPositionProbePattern(this.moduleCount - 7, 0);
          this.setupPositionProbePattern(0, this.moduleCount - 7);
          this.setupPositionAdjustPattern();
          this.setupTimingPattern();
          this.setupTypeInfo(test, maskPattern);
          if (this.typeNumber >= 7) this.setupTypeNumber(test);
          if (this.dataCache == null) {
            this.dataCache = QRCode.createData(this.typeNumber, this.errorCorrectionLevel, this.dataList);
          }
          this.mapData(this.dataCache, maskPattern);
        },
        setupPositionProbePattern: function (row, col) {
          for (var r = -1; r <= 7; r++) {
            if (row + r <= -1 || this.moduleCount <= row + r) continue;
            for (var c = -1; c <= 7; c++) {
              if (col + c <= -1 || this.moduleCount <= col + c) continue;
              if ((0 <= r && r <= 6 && (c == 0 || c == 6))
                || (0 <= c && c <= 6 && (r == 0 || r == 6))
                || (2 <= r && r <= 4 && 2 <= c && c <= 4)) {
                this.modules[row + r][col + c] = true;
              } else {
                this.modules[row + r][col + c] = false;
              }
            }
          }
        },
        getBestMaskPattern: function () {
          var minLostPoint = 0, pattern = 0;
          for (var i = 0; i < 8; i++) {
            this.makeImpl(true, i);
            var lostPoint = QRUtil.getLostPoint(this);
            if (i == 0 || minLostPoint > lostPoint) {
              minLostPoint = lostPoint;
              pattern = i;
            }
          }
          return pattern;
        },
        setupTimingPattern: function () {
          for (var r = 8; r < this.moduleCount - 8; r++) {
            if (this.modules[r][6] != null) continue;
            this.modules[r][6] = (r % 2 == 0);
          }
          for (var c = 8; c < this.moduleCount - 8; c++) {
            if (this.modules[6][c] != null) continue;
            this.modules[6][c] = (c % 2 == 0);
          }
        },
        setupPositionAdjustPattern: function () {
          var pos = QRUtil.getPatternPosition(this.typeNumber);
          for (var i = 0; i < pos.length; i++) {
            for (var j = 0; j < pos.length; j++) {
              var row = pos[i], col = pos[j];
              if (this.modules[row][col] != null) continue;
              for (var r = -2; r <= 2; r++) {
                for (var c = -2; c <= 2; c++) {
                  this.modules[row + r][col + c] = (r == -2 || r == 2 || c == -2 || c == 2 || (r == 0 && c == 0));
                }
              }
            }
          }
        },
        setupTypeNumber: function (test) {
          var bits = QRUtil.getBCHTypeNumber(this.typeNumber);
          for (var i = 0; i < 18; i++) {
            var mod = (!test && ((bits >> i) & 1) == 1);
            this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
            this.modules[i % 3 + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
          }
        },
        setupTypeInfo: function (test, maskPattern) {
          var data = (this.errorCorrectionLevel << 3) | maskPattern;
          var bits = QRUtil.getBCHTypeInfo(data);
          for (var i = 0; i < 15; i++) {
            var mod = (!test && ((bits >> i) & 1) == 1);
            if (i < 6) this.modules[i][8] = mod;
            else if (i < 8) this.modules[i + 1][8] = mod;
            else this.modules[this.moduleCount - 15 + i][8] = mod;

            if (i < 8) this.modules[8][this.moduleCount - i - 1] = mod;
            else if (i < 9) this.modules[8][15 - i - 1 + 1] = mod;
            else this.modules[8][15 - i - 1] = mod;
          }
          this.modules[this.moduleCount - 8][8] = (!test);
        },
        mapData: function (data, maskPattern) {
          var inc = -1, row = this.moduleCount - 1, bitIndex = 7, byteIndex = 0;
          for (var col = this.moduleCount - 1; col > 0; col -= 2) {
            if (col == 6) col--;
            while (true) {
              for (var c = 0; c < 2; c++) {
                if (this.modules[row][col - c] == null) {
                  var dark = false;
                  if (byteIndex < data.length) dark = (((data[byteIndex] >>> bitIndex) & 1) == 1);
                  if (QRUtil.getMask(maskPattern, row, col - c)) dark = !dark;
                  this.modules[row][col - c] = dark;
                  bitIndex--;
                  if (bitIndex == -1) { byteIndex++; bitIndex = 7; }
                }
              }
              row += inc;
              if (row < 0 || this.moduleCount <= row) { row -= inc; inc = -inc; break; }
            }
          }
        }
      };

      QRCode.createData = function (typeNumber, errorCorrectionLevel, dataList) {
        var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectionLevel);
        var buffer = new QRBitBuffer();
        for (var i = 0; i < dataList.length; i++) {
          var d = dataList[i];
          buffer.put(d.mode, 4);
          buffer.put(d.getLength(), QRUtil.getLengthInBits(d.mode, typeNumber));
          d.write(buffer);
        }
        var totalDataCount = 0;
        for (var i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
        if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) buffer.put(0, 4);
        while (buffer.getLengthInBits() % 8 != 0) buffer.putBit(false);
        while (true) {
          if (buffer.getLengthInBits() >= totalDataCount * 8) break;
          buffer.put(0xEC, 8);
          if (buffer.getLengthInBits() >= totalDataCount * 8) break;
          buffer.put(0x11, 8);
        }
        return QRCode.createBytes(buffer, rsBlocks);
      };

      QRCode.createBytes = function (buffer, rsBlocks) {
        var offset = 0, maxDcCount = 0, maxEcCount = 0;
        var dcdata = new Array(rsBlocks.length), ecdata = new Array(rsBlocks.length);
        for (var r = 0; r < rsBlocks.length; r++) {
          var dcCount = rsBlocks[r].dataCount, ecCount = rsBlocks[r].totalCount - dcCount;
          maxDcCount = Math.max(maxDcCount, dcCount);
          maxEcCount = Math.max(maxEcCount, ecCount);
          dcdata[r] = new Array(dcCount);
          for (var i = 0; i < dcdata[r].length; i++) dcdata[r][i] = 0xff & buffer.buffer[i + offset];
          offset += dcCount;
          var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
          var rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);
          var modPoly = rawPoly.mod(rsPoly);
          ecdata[r] = new Array(rsPoly.getLength() - 1);
          for (var i = 0; i < ecdata[r].length; i++) {
            var modIndex = i + modPoly.getLength() - ecdata[r].length;
            ecdata[r][i] = (modIndex >= 0) ? modPoly.get(modIndex) : 0;
          }
        }
        var totalCodeCount = 0;
        for (var i = 0; i < rsBlocks.length; i++) totalCodeCount += rsBlocks[i].totalCount;
        var data = new Array(totalCodeCount), index = 0;
        for (var i = 0; i < maxDcCount; i++) {
          for (var r = 0; r < rsBlocks.length; r++) {
            if (i < dcdata[r].length) data[index++] = dcdata[r][i];
          }
        }
        for (var i = 0; i < maxEcCount; i++) {
          for (var r = 0; r < rsBlocks.length; r++) {
            if (i < ecdata[r].length) data[index++] = ecdata[r][i];
          }
        }
        return data;
      };

      function QR8bitByte(data) {
        this.mode = 4;
        this.data = data;
      }
      QR8bitByte.prototype = {
        getLength: function () { return this.data.length; },
        write: function (buffer) {
          for (var i = 0; i < this.data.length; i++) buffer.put(this.data.charCodeAt(i), 8);
        }
      };

      var QRMath = {
        glog: function (n) { return QRMath.LOG_TABLE[n]; },
        gexp: function (n) {
          while (n < 0) n += 255;
          while (n >= 256) n -= 255;
          return QRMath.EXP_TABLE[n];
        },
        EXP_TABLE: new Array(256),
        LOG_TABLE: new Array(256)
      };
      for (var i = 0; i < 8; i++) QRMath.EXP_TABLE[i] = 1 << i;
      for (var i = 8; i < 256; i++) QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4] ^ QRMath.EXP_TABLE[i - 5] ^ QRMath.EXP_TABLE[i - 6] ^ QRMath.EXP_TABLE[i - 8];
      for (var i = 0; i < 255; i++) QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]] = i;

      function QRPolynomial(num, shift) {
        var offset = 0;
        while (offset < num.length && num[offset] == 0) offset++;
        this.num = new Array(num.length - offset + shift);
        for (var i = 0; i < num.length - offset; i++) this.num[i] = num[i + offset];
      }
      QRPolynomial.prototype = {
        get: function (i) { return this.num[i]; },
        getLength: function () { return this.num.length; },
        multiply: function (e) {
          var num = new Array(this.getLength() + e.getLength() - 1);
          for (var i = 0; i < this.getLength(); i++) {
            for (var j = 0; j < e.getLength(); j++) num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
          }
          return new QRPolynomial(num, 0);
        },
        mod: function (e) {
          if (this.getLength() - e.getLength() < 0) return this;
          var ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
          var num = new Array(this.getLength());
          for (var i = 0; i < this.getLength(); i++) num[i] = this.get(i);
          for (var i = 0; i < e.getLength(); i++) num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
          return new QRPolynomial(num, 0).mod(e);
        }
      };

      function QRRSBlock(totalCount, dataCount) {
        this.totalCount = totalCount;
        this.dataCount = dataCount;
      }
      QRRSBlock.RS_BLOCK_TABLE = [
        [1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9],
        [1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16],
        [1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13],
        [1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9],
        [1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12]
      ];
      QRRSBlock.getRSBlocks = function (typeNumber, errorCorrectionLevel) {
        var rsBlock = QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1]; // Level M (0)
        var length = rsBlock.length / 3, list = [];
        for (var i = 0; i < length; i++) {
          var count = rsBlock[i * 3 + 0], totalCount = rsBlock[i * 3 + 1], dataCount = rsBlock[i * 3 + 2];
          for (var j = 0; j < count; j++) list.push(new QRRSBlock(totalCount, dataCount));
        }
        return list;
      };

      function QRBitBuffer() {
        this.buffer = [];
        this.length = 0;
      }
      QRBitBuffer.prototype = {
        get: function (i) { return ((this.buffer[Math.floor(i / 8)] >>> (7 - i % 8)) & 1) == 1; },
        put: function (num, len) { for (var i = 0; i < len; i++) this.putBit(((num >>> (len - i - 1)) & 1) == 1); },
        getLengthInBits: function () { return this.length; },
        putBit: function (b) {
          var idx = Math.floor(this.length / 8);
          if (this.buffer.length <= idx) this.buffer.push(0);
          if (b) this.buffer[idx] |= (0x80 >>> (this.length % 8));
          this.length++;
        }
      };

      var QRUtil = {
        PATTERN_POSITION_TABLE: [[], [6, 18], [6, 22], [6, 26], [6, 30]],
        getPatternPosition: function (t) { return QRUtil.PATTERN_POSITION_TABLE[t - 1] || []; },
        getMask: function (m, i, j) {
          switch (m) {
            case 0: return (i + j) % 2 == 0;
            case 1: return i % 2 == 0;
            case 2: return j % 3 == 0;
            case 3: return (i + j) % 3 == 0;
            case 4: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 == 0;
            case 5: return (i * j) % 2 + (i * j) % 3 == 0;
            case 6: return ((i * j) % 2 + (i * j) % 3) % 2 == 0;
            case 7: return ((i * j) % 3 + (i + j) % 2) % 2 == 0;
            default: return false;
          }
        },
        getErrorCorrectPolynomial: function (len) {
          var a = new QRPolynomial([1], 0);
          for (var i = 0; i < len; i++) a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
          return a;
        },
        getLengthInBits: function (m, t) { return 8; },
        getLostPoint: function (qr) {
          var count = qr.getModuleCount(), lost = 0;
          for (var r = 0; r < count; r++) {
            for (var c = 0; c < count; c++) {
              var same = 0, dark = qr.isDark(r, c);
              for (var dr = -1; dr <= 1; dr++) {
                if (r + dr < 0 || count <= r + dr) continue;
                for (var dc = -1; dc <= 1; dc++) {
                  if (c + dc < 0 || count <= c + dc || (dr == 0 && dc == 0)) continue;
                  if (dark == qr.isDark(r + dr, c + dc)) same++;
                }
              }
              if (same > 5) lost += (3 + same - 5);
            }
          }
          return lost;
        },
        getBCHTypeInfo: function (d) {
          var d1 = d << 10;
          while (QRUtil.getBCHDigit(d1) - QRUtil.getBCHDigit(1335) >= 0) {
            d1 ^= (1335 << (QRUtil.getBCHDigit(d1) - QRUtil.getBCHDigit(1335)));
          }
          return ((d << 10) | d1) ^ 21522;
        },
        getBCHTypeNumber: function (d) {
          var d1 = d << 12;
          while (QRUtil.getBCHDigit(d1) - QRUtil.getBCHDigit(7973) >= 0) {
            d1 ^= (7973 << (QRUtil.getBCHDigit(d1) - QRUtil.getBCHDigit(7973)));
          }
          return (d << 12) | d1;
        },
        getBCHDigit: function (d) {
          var digit = 0;
          while (d != 0) { digit++; d >>>= 1; }
          return digit;
        }
      };

      var qr = new QRCode(0, 0); // Type auto, Level M (0)
      qr.addData(text);
      qr.make();

      var cellSize = 4;
      var margin = 16;
      var modCount = qr.getModuleCount();
      var size = modCount * cellSize + margin * 2;
      var rects = '';

      for (var r = 0; r < modCount; r++) {
        for (var c = 0; c < modCount; c++) {
          if (qr.isDark(r, c)) {
            var x = c * cellSize + margin;
            var y = r * cellSize + margin;
            rects += '<rect x="' + x + '" y="' + y + '" width="' + cellSize + '" height="' + cellSize + '" fill="#000000"/>';
          }
        }
      }

      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '" width="100%" height="100%" aria-label="UPI QR Code">' +
        '<rect width="100%" height="100%" fill="#FFFFFF"/>' + rects + '</svg>';
    }

    // ==========================================================================
    // UPI PAYMENT ORCHESTRATION
    // ==========================================================================
    function openUpiModal() {
      if (!upiModal) return;

      // Render QR Code once if not yet cached
      if (!isQrGenerated && upiQrContainer) {
        upiQrContainer.innerHTML = createQrSvg(UPI_PAY_URL);
        isQrGenerated = true;
      }

      upiModal.classList.add('upi-modal-open');
      upiModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    function closeUpiModal() {
      if (!upiModal) return;
      upiModal.classList.remove('upi-modal-open');
      upiModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    async function copyUpiId() {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(UPI_ID);
        } else {
          const textarea = document.createElement('textarea');
          textarea.value = UPI_ID;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }

        if (btnCopyUpiText) {
          btnCopyUpiText.textContent = 'Copied!';
          setTimeout(() => {
            btnCopyUpiText.textContent = 'Copy';
          }, 2000);
        }
        showToast('UPI ID copied to clipboard');
      } catch (err) {
        showToast('Could not copy UPI ID');
      }
    }

    function handlePayUpiClick() {
      const userAgent = navigator.userAgent || '';
      const isMobile = /Android|iPhone|iPad|iPod/i.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

      if (isMobile) {
        window.location.href = UPI_PAY_URL;
      } else {
        openUpiModal();
      }
    }

    // ==========================================================================
    // EVENT BINDINGS
    // ==========================================================================
    if (btnSaveContact) {
      btnSaveContact.addEventListener('click', handleSaveContact);
    }

    if (btnShare) {
      btnShare.addEventListener('click', shareProfile);
    }

    if (payUpiBtn) {
      payUpiBtn.addEventListener('click', handlePayUpiClick);
    }

    if (upiSheetBtn) {
      upiSheetBtn.addEventListener('click', openUpiModal);
    }

    if (btnCopyUpi) {
      btnCopyUpi.addEventListener('click', copyUpiId);
    }

    if (upiModalClose) {
      upiModalClose.addEventListener('click', closeUpiModal);
    }

    if (upiModalBackdrop) {
      upiModalBackdrop.addEventListener('click', closeUpiModal);
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (upiModal && upiModal.classList.contains('upi-modal-open')) {
          closeUpiModal();
        }
      }
    });

    // Start sequence when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initIntroSequence);
    } else {
      initIntroSequence();
    }
  }) ();
