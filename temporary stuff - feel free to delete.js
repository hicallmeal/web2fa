function updateStorage(issuer, id, variable, value) {
    chrome.storage.sync.get("internal", (item) => {
        item.internal.tokens[issuer].accounts[id][variable] = value;
        chrome.storage.sync.set(item)
    })

}

class Token {
    #user;
    #secret;

    constructor(tokenUser, tokenSecret, tokenIssuer, tokenId,tokenIssuerSettings) {
        this.#user = tokenUser;
        this.#secret = tokenSecret;
        this.issuer = tokenIssuer;
        this.settings = tokenIssuerSettings
        // this.id = tokenId;
    }
    

    set user(value) {
        updateStorage(this.issuer, this.id, "user", value)
        this.#user = value;
    }

    set secret(value) {
        updateStorage(this.issuer, this.id, "secret", value)
        this.#secret = value;
    }

    set index(position) {}

}

// global
const totp = new jsOTP.totp();

function displayToken(token) {
    
    tokenElement = `
        <div class="tokenField">
            <div class="tokenUser>${user}</div>
            <div class="tokenSecret">${secret}</div>
        </div>
        `

}