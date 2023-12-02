chrome.storage.sync.get(null, function(syncStorage) {

    const tokenKeys = Object.keys(syncStorage.internal.tokens)

    // Check for tokens
    if (tokenKeys.length) {

        for (let issuer of tokenKeys) {

          for (let account of Object.keys(syncStorage.internal.tokens[issuer])) {
              // displayToken("1234123412341234", "test", "Testrosoft", {settings: {}})
              // displayToken(syncStorage.internal.tokens[issuer][account]["secret"], syncStorage.internal.tokens[issuer][account]["username"], issuer, syncStorage[issuer]);
              displayToken(issuer, account, syncStorage.internal.tokens[issuer][account], syncStorage[issuer])
          }
        }
    }
    // else {
    //     document.querySelector(".empty_filler").style.display = "Block";
    // }
})

document.querySelector("#scanner").addEventListener("click", ()=> {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {type: "getQR"});
  });
    window.close();
});


function deleteToken(user, imageData, issuer) {
  return new Promise((resolve) => {

    let deletionModal = document.createElement("dialog")
    // did have a look into "img[src='']:before" for non-existent images, but couldn't quite implement it

    user = (imageData) ? user : `${issuer} | ${user}`
    deletionModal.innerHTML = `
      <form>
        <div class="dialogTitle">
          <h3>Remove</h3>
          <div style="line-height: 1.2; text-align: center;">
            <img alt="GitLab" src="${imageData}" class="imageSmall">
            <h3 id="dialogUser">${user}?</h3>
          </div>
        </div>
        <div class="dialogContent">
          <div>
              <p>This is a <strong>permanent</strong> action that <strong>cannot</strong> be undone.</p>
              <p>Ensure you:</p>
          </div>
          <div>
              <ul>
                  <li>Back up your codes</li>
                  <li>Turn off 2FA for this account</li>
                  <li>Have an alternative authenticator</li>
              </ul>
          </div>
        </div>
        <div class="dialogOptions">
          <button class="proceed" value="remove">Remove</button>
          <button class="cancel" value="cancel" formmethod="dialog" autofocus>Cancel</button>
        </div>
      </form>
      `
      
    document.body.appendChild(deletionModal)
    
    deletionModal.showModal()

    deletionModal.querySelector(".proceed").addEventListener("click",(e)=> {  // could be the form closing one - given a refresh will show the changes?
      e.preventDefault()
      deletionModal.close(e.target.value);
    })

    deletionModal.addEventListener("close", ()=> {
      document.body.removeChild(deletionModal);
      resolve(deletionModal.returnValue)
    })
  })
}

// helper colour function for Icons..
function tempColour(string) {
  let hex = (parseInt(string.split("")
     .map(c => c.charCodeAt(0).toString(16).padStart(2, "0"))
     .join("").slice(0,6),16) * 2).toString(16);
  if (hex.match(/.{1,2}/g).map(e => parseInt(e, 16)).reduce((x,y) => x+y,0) > 376) {
    return {bgColour:hex, colour:"black"}
  }
  return {bgColour:hex, colour:"white"}
}

// creates placeholder Icon
function createPlaceholderIcon(issuer) {
  let colour = tempColour(issuer)
  let icon = `<div style="color: ${colour.colour}; background-color: #${colour.bgColour}" class="letterIcon">${issuer[0].toUpperCase()}</div>`
  return icon
}

function queryIcon(issuer) {
  let iconModal = document.createElement("dialog")
  iconModal.innerHTML = `
    <form>
      <div class="dialogTitle">
        <h3>Are you on ${issuer}'s 2FA Setup Page?</h3>
      </div>
      <div>
        <p>To add the icon: </p>
        <ol>
          <li>Go to <span style="text-transform: capitalize;">${issuer}'s</span> 2FA Setup or Homepage</li>
          <li>Click <strong>I'm There</strong></li>
        </ol>
      </div>
      <div class="dialogOptions">
        <button id="yes">I'm There</button>
        <button class="cancel" formmethod="dialog" autofocus>Cancel</button>
      </div>
    </form>
    `
    iconModal.style.height = "min-content";

    document.body.appendChild(iconModal)
    
    iconModal.showModal()

    iconModal.querySelector("#yes").addEventListener("click",(e)=> { 
      e.preventDefault()
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {type: "updateIcon", issuer:issuer, fav: tabs[0].favIconUrl});
      });
      window.close();
    })

    iconModal.addEventListener("close", ()=> {
      document.body.removeChild(iconModal);
    })

    // <form>
    //   <div class="dialogTitle">
    //     <h3>Are you on ${issuer}'s 2FA Setup Page?</h3>
    //   </div>
    //   <div class="dialogContent">
    //     <div>
    //         <p>Go to ${issuer}'s 2FA or Home Page</p>
    //         <p>Or type in the address</p>
    //         <input class="dialogInput" type="text" placeholder='${issuer}.com/..'>
    //         <p>Then hit Go</p>
    //     </div>
    //   </div>
    //   <div class="dialogOptions">
    //     <button class="go">Go</button>
    //     <button class="cancel" formmethod="dialog">Cancel</button>
    //   </div>
    // </form>


}

function displayToken (issuer, userGUID, accountDetails, issuerSettings) {
    // maybe accept just one object?
    var totp = new jsOTP.totp();
    let key = accountDetails.secret
    let user = accountDetails.username
    let visualIssuer = issuer.charAt(0).toUpperCase() + issuer.slice(1);
    // Initial element creation
  

    let token = document.createElement("div");
    token.className = "tokenField";

    let imageData = (issuerSettings) ? issuerSettings.settings.favicon : "";

    if (imageData) {
      token.innerHTML = `
      <div class="tokenIssuer">
          <img src="${imageData}">
      </div>
      <div class="tokenUser">${user}</div>
      ` 
    }
    else {
      let icon = createPlaceholderIcon(issuer);
      token.innerHTML = `
      <div class="tokenIssuer">
          ${icon}
      </div>
      <div class="tokenUser">${visualIssuer} | ${user}</div>
      ` 
      token.querySelector(".letterIcon").addEventListener("click", (e)=> {queryIcon(issuer)})
    }



    let secret = document.createElement("div")
    secret.className = "tokenSecret"
    let keyCode = totp.getOtp(key)
    secret.innerText = `${keyCode.slice(0,3)} ${keyCode.slice(3)}`;

    token.appendChild(secret)

    document.querySelector("#tokens").appendChild(token)    

    // Countdown Timer

    let countdown = document.createElement("div")
    countdown.className = "countdown" 
    

    let time = new Date;
    let initSeconds = time.getSeconds()
    let initDelay = 30 - ((initSeconds >= 30) ? initSeconds - 30 : initSeconds);


    countdown.innerHTML = `
        <div class="base-timer">
        <svg class="base-timer__svg" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg">
            <g class="base-timer__circle">
            <circle class="base-timer__path-elapsed" cx="33" cy="33" r="30" />
            <path
                id="base-timer-path-remaining"
                class="base-timer__path-remaining"
                d="
                M 33, 33
                m -30, 0
                a 30,30 0 1,0 60,0
                a 30,30 0 1,0 -60,0
                "
            ></path>
            </g>
        </svg>
        <span class="time base-timer__label">
                ${initDelay}
        </span>
        </div>
    `
        
        
    token.appendChild(countdown)
        
        
    function calculateTimeFraction() {
        // return (initDelay - 1) / 30; # Supposedly to remove little bit before 30 hits. 
        let rawTimeFraction = (initDelay) / 30;
        return rawTimeFraction  - (1 / 30) * (1 - rawTimeFraction);
    }
    
    function setCircleDasharray() {
        const circleDasharray = `${(
            calculateTimeFraction() * 189
    ).toFixed(0)} 189`;
    countdown
        .querySelector("#base-timer-path-remaining")
        .setAttribute("stroke-dasharray", circleDasharray);
    }
    
    setCircleDasharray()
    
        
    // let quickStart = setInterval(() => {   
    //     clearInterval(quickStart);              # attempt to initiate the timer quicker
    // }, time.getMilliseconds())
        
    let tokenCountdown = setInterval(() => {
    
        initDelay -= 1
        
        // let time = new Date;
        // let initSeconds = time.getSeconds()
        // initDelay = 30 - ((initSeconds >= 30) ? initSeconds - 30 : initSeconds); # Poll for time every interval
        // countdown.querySelector(".time").innerText = initDelay;                  # Opting for simple enumeration instead
        
        // if (initSeconds == 30 || initSeconds == 0) {
        
        // For No loopy transition - visually looks slower though..
        countdown.querySelector("#base-timer-path-remaining").classList.remove("noTransition")
          
        if (initDelay == 0) {
          let keyCode = totp.getOtp(key)
          secret.innerText = `${keyCode.slice(0,3)} ${keyCode.slice(3)}`;
          initDelay = 30
          
          // For No loopy transition - visually looks slower though..
          countdown.querySelector("#base-timer-path-remaining").classList.add("noTransition")
        }

        setCircleDasharray();
        

        countdown.querySelector(".time").innerText = initDelay;

        
            
    }, 1000);

    
    // Token Deletion

    deleteTokenEl = document.createElement("div")
    deleteTokenEl.className = "deleteButton"
    deleteTokenEl.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="m416 208h-384c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h384c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z"/></svg>'
    
    token.appendChild(deleteTokenEl)
    
    deleteTokenEl.addEventListener("click", async ()=>{
      deleteToken(user, imageData, visualIssuer).then((deletionEvent) => {

        if (deletionEvent == "remove") {

          chrome.storage.sync.get(["internal"], function(sync) {
            delete sync.internal.tokens[issuer][userGUID]

            if ( !(Object.keys(sync.internal.tokens[issuer]).length) ) {
              delete sync.internal.tokens[issuer]
              chrome.storage.sync.remove(issuer)
            }
            chrome.storage.sync.set(sync);
          });
          clearInterval(tokenCountdown);
          document.querySelector("#tokens").removeChild(token)
        }
      })
    })


    // not addressed: Missing Icon (Modal?), Copy, ~~Delete~~. 
   
    //     token.addEventListener("click", ()=> {navigator.clipboard.writeText(p_cont.querySelector(".token").innerText);});

    //     copyElement.addEventListener("click", ()=>{
    //         navigator.clipboard.writeText(p_cont.querySelector(".token").innerText);
    //     });

}


(function() {
    var r, e;
    e = class {
      constructor(r = 30, e = 6) {
        if (this.expiry = r, this.length = e, this.length > 8 || this.length < 6) throw "Error: invalid code length"
      }
      dec2hex(r) {
        return (r < 15.5 ? "0" : "") + Math.round(r).toString(16)
      }
      hex2dec(r) {
        return parseInt(r, 16)
      }
      base32tohex(r) {
        var e, n, t, o, h;
        for ("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567", e = "", t = "", o = 0; o < r.length;) h = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(r.charAt(o).toUpperCase()), e += this.leftpad(h.toString(2), 5, "0"), o++;
        for (o = 0; o + 4 <= e.length;) n = e.substr(o, 4), t += parseInt(n, 2).toString(16), o += 4;
        return t
      }
      leftpad(r, e, n) {
        return e + 1 >= r.length && (r = Array(e + 1 - r.length).join(n) + r), r
      }
      getOtp(r, e = (new Date).getTime()) {
        var n, t, o, h, i, w, d;
        if (o = this.base32tohex(r), n = Math.round(e / 1e3), d = this.leftpad(this.dec2hex(Math.floor(n / this.expiry)), 16, "0"), (w = new jsSHA("SHA-1", "HEX")).setHMACKey(o, "HEX"), w.update(d), "KEY MUST BE IN BYTE INCREMENTS" === (t = w.getHMAC("HEX"))) throw "Error: hex key must be in byte increments";
        return h = this.hex2dec(t.substring(t.length - 1)), i = (i = (this.hex2dec(t.substr(2 * h, 8)) & this.hex2dec("7fffffff")) + "").length > this.length ? i.substr(i.length - this.length, this.length) : this.leftpad(i, this.length, "0")
      }
    }, r = class {
      constructor(r = 6) {
        if (this.length = r, this.length > 8 || this.length < 6) throw "Error: invalid code length"
      }
      uintToString(r) {
        var e;
        return e = String.fromCharCode.apply(null, r), decodeURIComponent(escape(e))
      }
      getOtp(r, e) {
        var n, t, o, h, i;
        return (h = new jsSHA("SHA-1", "TEXT")).setHMACKey(r, "TEXT"), h.update(this.uintToString(new Uint8Array(this.intToBytes(e)))), n = h.getHMAC("HEX"), i = (127 & (t = this.hexToBytes(n))[o = 15 & t[19]]) << 24 | (255 & t[o + 1]) << 16 | (255 & t[o + 2]) << 8 | 255 & t[o + 3], (i += "").substr(i.length - this.length, this.length)
      }
      intToBytes(r) {
        var e, n;
        for (e = [], n = 7; n >= 0;) e[n] = 255 & r, r >>= 8, --n;
        return e
      }
      hexToBytes(r) {
        var e, n, t;
        for (n = [], t = 0, e = r.length; t < e;) n.push(parseInt(r.substr(t, 2), 16)), t += 2;
        return n
      }
    }, window.jsOTP = {}, jsOTP.totp = e, jsOTP.hotp = r
  }).call(this);
  var SUPPORTED_ALGS = 7;
  ! function(r) {
    "use strict";
  
    function e(r, e) {
      this.highOrder = r, this.lowOrder = e
    }
  
    function n(r, e, n) {
      var t, o, h, i, w, d, u = r.length;
      if (t = e || [0], d = (n = n || 0) >>> 3, 0 != u % 2) throw new Error("String of HEX type must be in byte increments");
      for (o = 0; o < u; o += 2) {
        if (h = parseInt(r.substr(o, 2), 16), isNaN(h)) throw new Error("String of HEX type contains invalid characters");
        for (i = (w = (o >>> 1) + d) >>> 2; t.length <= i;) t.push(0);
        t[i] |= h << 8 * (3 - w % 4)
      }
      return {
        value: t,
        binLen: 4 * u + n
      }
    }
  
    function t(r, e, n) {
      var t, o, h, i, w, d = [];
      for (d = e || [0], h = (n = n || 0) >>> 3, o = 0; o < r.length; o += 1) t = r.charCodeAt(o), i = (w = o + h) >>> 2, d.length <= i && d.push(0), d[i] |= t << 8 * (3 - w % 4);
      return {
        value: d,
        binLen: 8 * r.length + n
      }
    }
  
    function o(r, e, n) {
      var t, o, h, i, w, d, u, a, l = [],
        s = 0;
      if (l = e || [0], d = (n = n || 0) >>> 3, -1 === r.search(/^[a-zA-Z0-9=+\/]+$/)) throw new Error("Invalid character in base-64 string");
      if (w = r.indexOf("="), r = r.replace(/\=/g, ""), -1 !== w && w < r.length) throw new Error("Invalid '=' found in base-64 string");
      for (t = 0; t < r.length; t += 4) {
        for (i = r.substr(t, 4), h = 0, o = 0; o < i.length; o += 1) h |= "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".indexOf(i[o]) << 18 - 6 * o;
        for (o = 0; o < i.length - 1; o += 1) {
          for (u = (a = s + d) >>> 2; l.length <= u;) l.push(0);
          l[u] |= (h >>> 16 - 8 * o & 255) << 8 * (3 - a % 4), s += 1
        }
      }
      return {
        value: l,
        binLen: 8 * s + n
      }
    }
  
    function h(r, e) {
      var n, t, o = "",
        h = 4 * r.length;
      for (n = 0; n < h; n += 1) t = r[n >>> 2] >>> 8 * (3 - n % 4), o += "0123456789abcdef".charAt(t >>> 4 & 15) + "0123456789abcdef".charAt(15 & t);
      return e.outputUpper ? o.toUpperCase() : o
    }
  
    function i(r, e) {
      var n, t, o, h, i, w, d = "",
        u = 4 * r.length;
      for (n = 0; n < u; n += 3)
        for (h = n + 1 >>> 2, i = r.length <= h ? 0 : r[h], h = n + 2 >>> 2, w = r.length <= h ? 0 : r[h], o = (r[n >>> 2] >>> 8 * (3 - n % 4) & 255) << 16 | (i >>> 8 * (3 - (n + 1) % 4) & 255) << 8 | w >>> 8 * (3 - (n + 2) % 4) & 255, t = 0; t < 4; t += 1) 8 * n + 6 * t <= 32 * r.length ? d += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".charAt(o >>> 6 * (3 - t) & 63) : d += e.b64Pad;
      return d
    }
  
    function w(r) {
      var e, n, t = "",
        o = 4 * r.length;
      for (e = 0; e < o; e += 1) n = r[e >>> 2] >>> 8 * (3 - e % 4) & 255, t += String.fromCharCode(n);
      return t
    }
  
    function d(r) {
      var e, n = {
        outputUpper: !1,
        b64Pad: "="
      };
      if (e = r || {}, n.outputUpper = e.outputUpper || !1, n.b64Pad = e.b64Pad || "=", "boolean" != typeof n.outputUpper) throw new Error("Invalid outputUpper formatting option");
      if ("string" != typeof n.b64Pad) throw new Error("Invalid b64Pad formatting option");
      return n
    }
  
    function u(r, e) {
      var h;
      switch (e) {
        case "UTF8":
        case "UTF16BE":
        case "UTF16LE":
          break;
        default:
          throw new Error("encoding must be UTF8, UTF16BE, or UTF16LE")
      }
      switch (r) {
        case "HEX":
          h = n;
          break;
        case "TEXT":
          h = function(r, n, t) {
            return function(r, e, n, t) {
              var o, h, i, w, d, u, a = [],
                l = [],
                s = 0;
              if (a = n || [0], w = (t = t || 0) >>> 3, "UTF8" === e)
                for (h = 0; h < r.length; h += 1)
                  for (l = [], 128 > (o = r.charCodeAt(h)) ? l.push(o) : 2048 > o ? (l.push(192 | o >>> 6), l.push(128 | 63 & o)) : 55296 > o || 57344 <= o ? l.push(224 | o >>> 12, 128 | o >>> 6 & 63, 128 | 63 & o) : (h += 1, o = 65536 + ((1023 & o) << 10 | 1023 & r.charCodeAt(h)), l.push(240 | o >>> 18, 128 | o >>> 12 & 63, 128 | o >>> 6 & 63, 128 | 63 & o)), i = 0; i < l.length; i += 1) {
                    for (d = (u = s + w) >>> 2; a.length <= d;) a.push(0);
                    a[d] |= l[i] << 8 * (3 - u % 4), s += 1
                  } else if ("UTF16BE" === e || "UTF16LE" === e)
                    for (h = 0; h < r.length; h += 1) {
                      for (o = r.charCodeAt(h), "UTF16LE" === e && (o = (i = 255 & o) << 8 | o >>> 8), d = (u = s + w) >>> 2; a.length <= d;) a.push(0);
                      a[d] |= o << 8 * (2 - u % 4), s += 2
                    }
              return {
                value: a,
                binLen: 8 * s + t
              }
            }(r, e, n, t)
          };
          break;
        case "B64":
          h = o;
          break;
        case "BYTES":
          h = t;
          break;
        default:
          throw new Error("format must be HEX, TEXT, B64, or BYTES")
      }
      return h
    }
  
    function a(r, e) {
      return r << e | r >>> 32 - e
    }
  
    function l(r, e) {
      return r >>> e | r << 32 - e
    }
  
    function s(r, n) {
      var t = new e(r.highOrder, r.lowOrder);
      return 32 >= n ? new e(t.highOrder >>> n | t.lowOrder << 32 - n & 4294967295, t.lowOrder >>> n | t.highOrder << 32 - n & 4294967295) : new e(t.lowOrder >>> n - 32 | t.highOrder << 64 - n & 4294967295, t.highOrder >>> n - 32 | t.lowOrder << 64 - n & 4294967295)
    }
  
    function f(r, e) {
      return r >>> e
    }
  
    function O(r, n) {
      return 32 >= n ? new e(r.highOrder >>> n, r.lowOrder >>> n | r.highOrder << 32 - n & 4294967295) : new e(0, r.highOrder >>> n - 32)
    }
  
    function g(r, e, n) {
      return r ^ e ^ n
    }
  
    function c(r, e, n) {
      return r & e ^ ~r & n
    }
  
    function S(r, n, t) {
      return new e(r.highOrder & n.highOrder ^ ~r.highOrder & t.highOrder, r.lowOrder & n.lowOrder ^ ~r.lowOrder & t.lowOrder)
    }
  
    function p(r, e, n) {
      return r & e ^ r & n ^ e & n
    }
  
    function E(r, n, t) {
      return new e(r.highOrder & n.highOrder ^ r.highOrder & t.highOrder ^ n.highOrder & t.highOrder, r.lowOrder & n.lowOrder ^ r.lowOrder & t.lowOrder ^ n.lowOrder & t.lowOrder)
    }
  
    function A(r) {
      return l(r, 2) ^ l(r, 13) ^ l(r, 22)
    }
  
    function H(r) {
      var n = s(r, 28),
        t = s(r, 34),
        o = s(r, 39);
      return new e(n.highOrder ^ t.highOrder ^ o.highOrder, n.lowOrder ^ t.lowOrder ^ o.lowOrder)
    }
  
    function T(r) {
      return l(r, 6) ^ l(r, 11) ^ l(r, 25)
    }
  
    function v(r) {
      var n = s(r, 14),
        t = s(r, 18),
        o = s(r, 41);
      return new e(n.highOrder ^ t.highOrder ^ o.highOrder, n.lowOrder ^ t.lowOrder ^ o.lowOrder)
    }
  
    function b(r) {
      return l(r, 7) ^ l(r, 18) ^ f(r, 3)
    }
  
    function P(r) {
      var n = s(r, 1),
        t = s(r, 8),
        o = O(r, 7);
      return new e(n.highOrder ^ t.highOrder ^ o.highOrder, n.lowOrder ^ t.lowOrder ^ o.lowOrder)
    }
  
    function U(r) {
      return l(r, 17) ^ l(r, 19) ^ f(r, 10)
    }
  
    function m(r) {
      var n = s(r, 19),
        t = s(r, 61),
        o = O(r, 6);
      return new e(n.highOrder ^ t.highOrder ^ o.highOrder, n.lowOrder ^ t.lowOrder ^ o.lowOrder)
    }
  
    function C(r, e) {
      var n = (65535 & r) + (65535 & e);
      return (65535 & (r >>> 16) + (e >>> 16) + (n >>> 16)) << 16 | 65535 & n
    }
  
    function L(r, e, n, t) {
      var o = (65535 & r) + (65535 & e) + (65535 & n) + (65535 & t);
      return (65535 & (r >>> 16) + (e >>> 16) + (n >>> 16) + (t >>> 16) + (o >>> 16)) << 16 | 65535 & o
    }
  
    function y(r, e, n, t, o) {
      var h = (65535 & r) + (65535 & e) + (65535 & n) + (65535 & t) + (65535 & o);
      return (65535 & (r >>> 16) + (e >>> 16) + (n >>> 16) + (t >>> 16) + (o >>> 16) + (h >>> 16)) << 16 | 65535 & h
    }
  
    function R(r, n) {
      var t, o, h;
      return t = (65535 & r.lowOrder) + (65535 & n.lowOrder), h = (65535 & (o = (r.lowOrder >>> 16) + (n.lowOrder >>> 16) + (t >>> 16))) << 16 | 65535 & t, t = (65535 & r.highOrder) + (65535 & n.highOrder) + (o >>> 16), new e((65535 & (o = (r.highOrder >>> 16) + (n.highOrder >>> 16) + (t >>> 16))) << 16 | 65535 & t, h)
    }
  
    function x(r, n, t, o) {
      var h, i, w;
      return h = (65535 & r.lowOrder) + (65535 & n.lowOrder) + (65535 & t.lowOrder) + (65535 & o.lowOrder), w = (65535 & (i = (r.lowOrder >>> 16) + (n.lowOrder >>> 16) + (t.lowOrder >>> 16) + (o.lowOrder >>> 16) + (h >>> 16))) << 16 | 65535 & h, h = (65535 & r.highOrder) + (65535 & n.highOrder) + (65535 & t.highOrder) + (65535 & o.highOrder) + (i >>> 16), new e((65535 & (i = (r.highOrder >>> 16) + (n.highOrder >>> 16) + (t.highOrder >>> 16) + (o.highOrder >>> 16) + (h >>> 16))) << 16 | 65535 & h, w)
    }
  
    function B(r, n, t, o, h) {
      var i, w, d;
      return i = (65535 & r.lowOrder) + (65535 & n.lowOrder) + (65535 & t.lowOrder) + (65535 & o.lowOrder) + (65535 & h.lowOrder), d = (65535 & (w = (r.lowOrder >>> 16) + (n.lowOrder >>> 16) + (t.lowOrder >>> 16) + (o.lowOrder >>> 16) + (h.lowOrder >>> 16) + (i >>> 16))) << 16 | 65535 & i, i = (65535 & r.highOrder) + (65535 & n.highOrder) + (65535 & t.highOrder) + (65535 & o.highOrder) + (65535 & h.highOrder) + (w >>> 16), new e((65535 & (w = (r.highOrder >>> 16) + (n.highOrder >>> 16) + (t.highOrder >>> 16) + (o.highOrder >>> 16) + (h.highOrder >>> 16) + (i >>> 16))) << 16 | 65535 & i, d)
    }
  
    function k(r) {
      var n, t, o;
      if ("SHA-1" === r && 1 & SUPPORTED_ALGS) n = [1732584193, 4023233417, 2562383102, 271733878, 3285377520];
      else {
        if (!(6 & SUPPORTED_ALGS)) throw new Error("No SHA variants supported");
        switch (t = [3238371032, 914150663, 812702999, 4144912697, 4290775857, 1750603025, 1694076839, 3204075428], o = [1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225], r) {
          case "SHA-224":
            n = t;
            break;
          case "SHA-256":
            n = o;
            break;
          case "SHA-384":
            n = [new e(3418070365, t[0]), new e(1654270250, t[1]), new e(2438529370, t[2]), new e(355462360, t[3]), new e(1731405415, t[4]), new e(41048885895, t[5]), new e(3675008525, t[6]), new e(1203062813, t[7])];
            break;
          case "SHA-512":
            n = [new e(o[0], 4089235720), new e(o[1], 2227873595), new e(o[2], 4271175723), new e(o[3], 1595750129), new e(o[4], 2917565137), new e(o[5], 725511199), new e(o[6], 4215389547), new e(o[7], 327033209)];
            break;
          default:
            throw new Error("Unknown SHA variant")
        }
      }
      return n
    }
  
    function D(r, e) {
      var n, t, o, h, i, w, d, u = [],
        l = c,
        s = g,
        f = p,
        O = a,
        S = C,
        E = y;
      for (n = e[0], t = e[1], o = e[2], h = e[3], i = e[4], d = 0; d < 80; d += 1) u[d] = d < 16 ? r[d] : O(u[d - 3] ^ u[d - 8] ^ u[d - 14] ^ u[d - 16], 1), w = d < 20 ? E(O(n, 5), l(t, o, h), i, 1518500249, u[d]) : d < 40 ? E(O(n, 5), s(t, o, h), i, 1859775393, u[d]) : d < 60 ? E(O(n, 5), f(t, o, h), i, 2400959708, u[d]) : E(O(n, 5), s(t, o, h), i, 3395469782, u[d]), i = h, h = o, o = O(t, 30), t = n, n = w;
      return e[0] = S(n, e[0]), e[1] = S(t, e[1]), e[2] = S(o, e[2]), e[3] = S(h, e[3]), e[4] = S(i, e[4]), e
    }
  
    function G(r, e, n, t) {
      var o, h, i;
      for (i = 15 + (e + 65 >>> 9 << 4); r.length <= i;) r.push(0);
      for (r[e >>> 5] |= 128 << 24 - e % 32, r[i] = e + n, h = r.length, o = 0; o < h; o += 16) t = D(r.slice(o, o + 16), t);
      return t
    }
    var M, X;
  
    function _(r, n, t) {
      var o, h, i, w, d, u, a, l, s, f, O, g, k, D, G, _, F, I, Y, N, j, K, Z, z, J, Q, V, W = [];
      if (("SHA-224" === t || "SHA-256" === t) && 2 & SUPPORTED_ALGS) O = 64, k = 1, Z = Number, D = C, G = L, _ = y, F = b, I = U, Y = A, N = T, K = p, j = c, V = M;
      else {
        if ("SHA-384" !== t && "SHA-512" !== t || !(4 & SUPPORTED_ALGS)) throw new Error("Unexpected error in SHA-2 implementation");
        O = 80, k = 2, Z = e, D = R, G = x, _ = B, F = P, I = m, Y = H, N = v, K = E, j = S, V = X
      }
      for (o = n[0], h = n[1], i = n[2], w = n[3], d = n[4], u = n[5], a = n[6], l = n[7], g = 0; g < O; g += 1) g < 16 ? (Q = g * k, z = r.length <= Q ? 0 : r[Q], J = r.length <= Q + 1 ? 0 : r[Q + 1], W[g] = new Z(z, J)) : W[g] = G(I(W[g - 2]), W[g - 7], F(W[g - 15]), W[g - 16]), s = _(l, N(d), j(d, u, a), V[g], W[g]), f = D(Y(o), K(o, h, i)), l = a, a = u, u = d, d = D(w, s), w = i, i = h, h = o, o = D(s, f);
      return n[0] = D(o, n[0]), n[1] = D(h, n[1]), n[2] = D(i, n[2]), n[3] = D(w, n[3]), n[4] = D(d, n[4]), n[5] = D(u, n[5]), n[6] = D(a, n[6]), n[7] = D(l, n[7]), n
    }
    6 & SUPPORTED_ALGS && (M = [1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, 2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711, 113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344, 430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479, 3329325298], 4 & SUPPORTED_ALGS && (X = [new e(M[0], 3609767458), new e(M[1], 602891725), new e(M[2], 3964484399), new e(M[3], 2173295548), new e(M[4], 4081628472), new e(M[5], 3053834265), new e(M[6], 2937671579), new e(M[7], 3664609560), new e(M[8], 2734883394), new e(M[9], 1164996542), new e(M[10], 1323610764), new e(M[11], 3590304994), new e(M[12], 4068182383), new e(M[13], 991336113), new e(M[14], 633803317), new e(M[15], 3479774868), new e(M[16], 2666613458), new e(M[17], 944711139), new e(M[18], 2341262773), new e(M[19], 2007800933), new e(M[20], 1495990901), new e(M[21], 1856431235), new e(M[22], 3175218132), new e(M[23], 2198950837), new e(M[24], 3999719339), new e(M[25], 766784016), new e(M[26], 2566594879), new e(M[27], 3203337956), new e(M[28], 1034457026), new e(M[29], 2466948901), new e(M[30], 3758326383), new e(M[31], 168717936), new e(M[32], 1188179964), new e(M[33], 1546045734), new e(M[34], 1522805485), new e(M[35], 2643833823), new e(M[36], 2343527390), new e(M[37], 1014477480), new e(M[38], 1206759142), new e(M[39], 344077627), new e(M[40], 1290863460), new e(M[41], 3158454273), new e(M[42], 3505952657), new e(M[43], 106217008), new e(M[44], 3606008344), new e(M[45], 1432725776), new e(M[46], 1467031594), new e(M[47], 851169720), new e(M[48], 3100823752), new e(M[49], 1363258195), new e(M[50], 3750685593), new e(M[51], 3785050280), new e(M[52], 3318307427), new e(M[53], 3812723403), new e(M[54], 2003034995), new e(M[55], 3602036899), new e(M[56], 1575990012), new e(M[57], 1125592928), new e(M[58], 2716904306), new e(M[59], 442776044), new e(M[60], 593698344), new e(M[61], 3733110249), new e(M[62], 2999351573), new e(M[63], 3815920427), new e(3391569614, 3928383900), new e(3515267271, 566280711), new e(3940187606, 3454069534), new e(4118630271, 4000239992), new e(116418474, 1914138554), new e(174292421, 2731055270), new e(289380356, 3203993006), new e(460393269, 320620315), new e(685471733, 587496836), new e(852142971, 1086792851), new e(1017036298, 365543100), new e(1126000580, 2618297676), new e(1288033470, 3409855158), new e(1501505948, 4234509866), new e(1607167915, 987167468), new e(1816402316, 1246189591)]));
    var F = function(r, e, n) {
      var t, o, a, l, s, f, O, g, c, S = 0,
        p = [],
        E = 0,
        A = r,
        H = !1,
        T = !1,
        v = [],
        b = [],
        P = !1;
      if (t = (c = n || {}).encoding || "UTF8", g = c.numRounds || 1, a = u(e, t), g !== parseInt(g, 10) || 1 > g) throw new Error("numRounds must a integer >= 1");
      if ("SHA-1" === A && 1 & SUPPORTED_ALGS) s = 512, f = D, O = G, l = 160;
      else if (6 & SUPPORTED_ALGS && (f = function(r, e) {
          return _(r, e, A)
        }, O = function(r, e, n, t) {
          return function(r, e, n, t, o) {
            var h, i, w, d, u;
            if (("SHA-224" === o || "SHA-256" === o) && 2 & SUPPORTED_ALGS) w = 15 + (e + 65 >>> 9 << 4), u = 16;
            else {
              if ("SHA-384" !== o && "SHA-512" !== o || !(4 & SUPPORTED_ALGS)) throw new Error("Unexpected error in SHA-2 implementation");
              w = 31 + (e + 129 >>> 10 << 5), u = 32
            }
            for (; r.length <= w;) r.push(0);
            for (r[e >>> 5] |= 128 << 24 - e % 32, r[w] = e + n, i = r.length, h = 0; h < i; h += u) t = _(r.slice(h, h + u), t, o);
            if ("SHA-224" === o && 2 & SUPPORTED_ALGS) d = [t[0], t[1], t[2], t[3], t[4], t[5], t[6]];
            else if ("SHA-256" === o && 2 & SUPPORTED_ALGS) d = t;
            else if ("SHA-384" === o && 4 & SUPPORTED_ALGS) d = [t[0].highOrder, t[0].lowOrder, t[1].highOrder, t[1].lowOrder, t[2].highOrder, t[2].lowOrder, t[3].highOrder, t[3].lowOrder, t[4].highOrder, t[4].lowOrder, t[5].highOrder, t[5].lowOrder];
            else {
              if (!("SHA-512" === o && 4 & SUPPORTED_ALGS)) throw new Error("Unexpected error in SHA-2 implementation");
              d = [t[0].highOrder, t[0].lowOrder, t[1].highOrder, t[1].lowOrder, t[2].highOrder, t[2].lowOrder, t[3].highOrder, t[3].lowOrder, t[4].highOrder, t[4].lowOrder, t[5].highOrder, t[5].lowOrder, t[6].highOrder, t[6].lowOrder, t[7].highOrder, t[7].lowOrder]
            }
            return d
          }(r, e, n, t, A)
        }), "SHA-224" === A && 2 & SUPPORTED_ALGS) s = 512, l = 224;
      else if ("SHA-256" === A && 2 & SUPPORTED_ALGS) s = 512, l = 256;
      else if ("SHA-384" === A && 4 & SUPPORTED_ALGS) s = 1024, l = 384;
      else {
        if (!("SHA-512" === A && 4 & SUPPORTED_ALGS)) throw new Error("Chosen SHA variant is not supported");
        s = 1024, l = 512
      }
      o = k(A), this.setHMACKey = function(r, e, n) {
        var h, i, w, d, a, l;
        if (!0 === T) throw new Error("HMAC key already set");
        if (!0 === H) throw new Error("Cannot set HMAC key after finalizing hash");
        if (!0 === P) throw new Error("Cannot set HMAC key after calling update");
        if (i = (h = u(e, t = (n || {}).encoding || "UTF8")(r)).binLen, w = h.value, l = (d = s >>> 3) / 4 - 1, d < i / 8) {
          for (w = O(w, i, 0, k(A)); w.length <= l;) w.push(0);
          w[l] &= 4294967040
        } else if (d > i / 8) {
          for (; w.length <= l;) w.push(0);
          w[l] &= 4294967040
        }
        for (a = 0; a <= l; a += 1) v[a] = 909522486 ^ w[a], b[a] = 1549556828 ^ w[a];
        o = f(v, o), S = s, T = !0
      }, this.update = function(r) {
        var e, n, t, h, i, w = 0,
          d = s >>> 5;
        for (n = (e = a(r, p, E)).binLen, h = e.value, t = n >>> 5, i = 0; i < t; i += d) w + s <= n && (o = f(h.slice(i, i + d), o), w += s);
        S += w, p = h.slice(w >>> 5), E = n % s, P = !0
      }, this.getHash = function(r, e) {
        var n, t, u;
        if (!0 === T) throw new Error("Cannot call getHash after setting HMAC key");
        switch (u = d(e), r) {
          case "HEX":
            n = function(r) {
              return h(r, u)
            };
            break;
          case "B64":
            n = function(r) {
              return i(r, u)
            };
            break;
          case "BYTES":
            n = w;
            break;
          default:
            throw new Error("format must be HEX, B64, or BYTES")
        }
        if (!1 === H)
          for (o = O(p, E, S, o), t = 1; t < g; t += 1) o = O(o, l, 0, k(A));
        return H = !0, n(o)
      }, this.getHMAC = function(r, e) {
        var n, t, u;
        if (!1 === T) throw new Error("Cannot call getHMAC without first setting HMAC key");
        switch (u = d(e), r) {
          case "HEX":
            n = function(r) {
              return h(r, u)
            };
            break;
          case "B64":
            n = function(r) {
              return i(r, u)
            };
            break;
          case "BYTES":
            n = w;
            break;
          default:
            throw new Error("outputFormat must be HEX, B64, or BYTES")
        }
        return !1 === H && (t = O(p, E, S, o), o = f(b, k(A)), o = O(t, l, s, o)), H = !0, n(o)
      }
    };
    "function" == typeof define && define.amd ? define(function() {
      return F
    }) : "undefined" != typeof exports ? "undefined" != typeof module && module.exports ? module.exports = exports = F : exports = F : r.jsSHA = F
  }(this);
  


function parseImport() {}

document.getElementById("quickMenu").addEventListener("click", () => {
  document.querySelector("dialog").showModal()
  document.querySelector(".tabButton").click()
})

document.querySelector(".closeButton").addEventListener("click", () => {
  document.querySelector("dialog").close()
})

function importAccounts() {}
function backup() {}


const manualEntryPoint = {
  entryFields : {
    account:"",
    key:"",
    issuer:"",
    settings: ""
  },

  // inputHandler(e) {
  //   e.target.setAttribute("value", e.target.value)
  //   manualEntryPoint.entryFields[e.target.name] = e.target.value;
  // },

  inputValidation(e) { // CONSISTENCY with data keys + variable names!!
    // e.preventDefault()
    // debugger
    let tokenData = Object.fromEntries(new FormData(e.target))
    // console.log(tokenData.entries())
    // for (const [name,value] of tokenData) {
    //   console.log(name, ":", value)
    // }
    
    // doing it here incase user enters spaces.
    console.log(tokenData)
    tokenData["secret"] = tokenData["secret"].replaceAll(" ", "");
    tokenData["user"] = tokenData["user"].replaceAll(" ", "");

    chrome.runtime.sendMessage({type:"addToken", tokenData:tokenData}, e => {
      // check if icon exists - assumption is that local will always have ?icon, on sync transfer, data is loaded to local
      // but then, an entry needs to be added too..
      
      let settings = e.settings; 

      if (!settings) {
        chrome.storage.local.get(["external"], storage => {
          settings = storage.external[tokenData.issuer]
          // need to figure out/establish how caching is properly going to work.. 
          // can't move this down below else: storage.get is asynchronous, runs after this whole block is done
          displayToken(tokenData.issuer, e.userGUID, {username: tokenData.user, secret: tokenData.secret}, settings)
          Array.from(document.querySelectorAll(".tokenField")).at(-1).scrollIntoView({behavior:"smooth"})
          if (settings) {
            chrome.storage.sync.set({[tokenData.issuer]: settings});
          } 
        }) // once fixed I can use this type of process for totp format import
      } 
      else { // okay. for scroll and for future proof - displaytoken will be a class or something, with a .scrollTo method and a .updateDetails method with user, secret, image params.
        displayToken(tokenData.issuer, e.userGUID, {username: tokenData.user, secret: tokenData.secret}, settings) // that way .update image can be called after displayToken.
        Array.from(document.querySelectorAll(".tokenField")).at(-1).scrollIntoView({behavior:"smooth"})
      }
      // could for now scroll to last elem?
    })
    e.target.reset()
    // scroll to new token?
  }
}
  // let issuers;
  // let local;
  // chrome.storage.local.get("external", (e)=>{
  //   issuerInputHandler.issuers = (Object.keys(e.external));
  //   issuerInputHandler.local = e.external;
  // })



  // need to figure out -> better to do this, or just add event listeners once at popup start.

  // document.querySelectorAll(".dialogInput:not(.dialogInput[name='issuer'])").forEach((item, index, array) => {
    
    
    // document.querySelector("input[name='issuer']").removeEventListener("input", issuerInputHandler.manualEntryHandler)
    // document.querySelector("input[name='issuer']").addEventListener("input", issuerInputHandler.manualEntryHandler)

document.querySelector("#qmManualOption form").addEventListener("submit", manualEntryPoint.inputValidation)

document.querySelectorAll(".dialogInput").forEach((item, index, array) => {
  item.removeEventListener("input", manualEntryPoint.inputHandler)
  item.addEventListener("input", manualEntryPoint.inputHandler)
})


// const issuerInputHandler = {
//   pollIssuers: undefined,
//   local: undefined,
//   issuers: undefined,


//   manualEntryHandler(e) {
//     e.target.setAttribute("value", e.target.value) 
//     clearTimeout(issuerInputHandler.pollIssuers)
//     issuerInputHandler.pollIssuers = setTimeout(() => {
//       console.log(e.target.value)
//       if (issuerInputHandler.issuers.includes(e.target.value)) {
//         document.getElementById("knownIssuer").innerHTML = `<span class="m_info"><span style="color: #0f9719;">Recognized</span> <img class="imageSmall" src="${issuerInputHandler.local[e.target.value.toLowerCase()].settings.favicon}"> <span style="font-weight: 600;">${e.target.value}</span> </span>`;
//       }
//       else {
//         document.getElementById("knownIssuer").innerHTML = `<div class="mInput">
//         <input type="text" value name="site" class="dialogInput">
//         <div class="mLabel" for="site">Setup Page</div>
//       </div>`
//       }
      
//     }, 1000)
//   }
// }

// function manualEntryHandler(e, issuers, local) {
//   e.target.setAttribute("value", e.target.value) 
//   if (e.target.name == "issuer") {

//     pollIssuers = setTimeout(() => {
//       if (issuers.includes(e.target.value)) {
//         document.getElementById("knownIssuer").innerHTML = `<span class="m_info"><span style="color: #0f9719;">Recognized</span> <img width="12" src="${local[e.target.value.toLowerCase()].settings.favicon}"> <span style="font-weight: 600;">${e.target.value}</span> </span>`;
//       }
      
//     }, 1000)
//   }
// }


const qmRef = {
  0: manualEntryPoint.manualEntry,
  1: importAccounts,
  2: backup,
}

document.querySelectorAll(".tabButton").forEach((item, index, array) => {
  item.addEventListener("click", (e)=> {
    document.querySelector(".activeTab").classList.toggle("activeTab")
    item.classList.toggle("activeTab")

    document.querySelector(".activeContent").classList.toggle("activeContent")
    document.querySelector("#qmContent").children[index].classList.toggle("activeContent")
  })
});


function fileHandler(e) {
  e.preventDefault();
  e.stopPropagation();

  if (ev.dataTransfer.items) {
    // Use DataTransferItemList interface to access the file(s)
    [...ev.dataTransfer.items].forEach((item, i) => {
      // If dropped items aren't files, reject them
      if (item.kind === 'file') {
        const file = item.getAsFile();
        console.log(`… file[${i}].name = ${file.name}`);
      }
    });
  } else {
    // Use DataTransfer interface to access the file(s)
    [...ev.dataTransfer.files].forEach((file, i) => {
      console.log(`… file[${i}].name = ${file.name}`);
    });
  }
}

// thinking what if - full back up is External + TOTP format accounts, instead of all of sync and all of external.
// that also means only one process for importing accounts
// will have to think about it.

// i guess it's not proofed for future synced settings..