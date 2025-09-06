import * as vscode from 'vscode';
import * as os from 'os';
import QRCode from 'qrcode';

export class SidebarProvider implements vscode.WebviewViewProvider {
  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    webviewView.webview.options = {
      enableScripts: true,
    };

    webviewView.webview.html = this.getHtml();

    // Listen for messages from the webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case 'userInput':
          vscode.window.showInformationMessage(`User typed: ${message.value}`);
          break;
        case 'generateQr':
          console.log("case generateQr", message.url);
          const qr = await this.generateQRCode(message.url);
          webviewView.webview.postMessage({ type: 'qrGenerated', value: qr });
          break;
      }
    });
  }

  private getLocalIpAddress() : string | undefined {
    const networkInterfaces = os.networkInterfaces();
    for (const name of Object.keys(networkInterfaces)) {
      const interfaceInfo = networkInterfaces[name];
      if (interfaceInfo) {
        for (const info of interfaceInfo) {
          if (info.family === 'IPv4' && !info.internal) {
            return info.address;
          }
        }
      }
    }
    return undefined;
  }

  private async generateQRCode(data: string): Promise<string> {
    try {
      console.log("Generating QR code for: ", data);
      return await QRCode.toDataURL(data, { margin: 2, width: 200 });
    } catch (err) {
      console.error("QR code generation failed", err);
      return "";
    }
  }

  private getHtml(): string {
    const ipAddress = this.getLocalIpAddress();
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>VSQR Sidebar</title>
        <link href="https://cdn.jsdelivr.net/npm/beercss@3.11.33/dist/cdn/beer.min.css" rel="stylesheet">
        <script type="module" src="https://cdn.jsdelivr.net/npm/beercss@3.11.33/dist/cdn/beer.min.js"></script>
        <script type="module" src="https://cdn.jsdelivr.net/npm/material-dynamic-colors@1.1.2/dist/cdn/material-dynamic-colors.min.js"></script>
        <style>
          body {
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            font-family: var(--vscode-font-family);
          }
          input.form-control {
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
          }
          button.btn {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
          }
          button.btn:hover {
            background-color: var(--vscode-button-hoverBackground);
          }
          input {
            background-color: var(--vscode-input-background) !important;
            color: var(--vscode-input-foreground) !important;
            border-color: var(--vscode-input-border) !important;
          }
        </style>
      </head>
      <body class="p-3">
        <h6>Easiest way to get your local website onto your phone</h6>

        <ul class="list">
          <li>
            <div class="max ip-address">
              <h6 class="small">Local IP Address</h6>
              <div id="ipValue">${ipAddress}</div>
            </div>
            <button class="transparent btn" id="visibilityBtn"><i>visibility</i></button>
          </li>
        </ul>

        <div style="display: flex; flex-direction: column; justify-content: center; align-items: center">
          <div class="field border" style="width: 100%">
            <input type="number" placeholder="Port Number" id="userInput">
          </div>
          <button id="sendBtn" style="max-width: 100%" class="btn">Generate QR Code</button>
          <div class="mt-2"></div>
          <div id="error-msg"></div>
          <div id="qrContainer" class="mt-2" style="margin-top: 2rem"></div>
        </div>

        <script>
          const vscode = acquireVsCodeApi();

          const sendBtn = document.getElementById("sendBtn");
          const userInput = document.getElementById("userInput");

          const visibilityBtn = document.getElementById("visibilityBtn");
          const ipValueDiv = document.getElementById("ipValue");

          // Store real IP so we can toggle back
          const realIp = ipValueDiv.textContent;
          let isHidden = true;

          // Mask the IP based on its format (e.g., 192.168.1.77 -> ***.***.*.**)
          const getMaskedIp = (ip) => {
              return ip.split('.').map(part => '*'.repeat(part.length)).join('.');
          };

          // Set the initial state to hidden (masked)
          const maskedIp = getMaskedIp(realIp);
          ipValueDiv.textContent = maskedIp;
          visibilityBtn.innerHTML = "<i>visibility_off</i>";

          // Function to handle QR code generation logic
          const generateQrCode = () => {
              const value = userInput.value;
              const url = 'http://${ipAddress}:' + value;
              vscode.postMessage({ type: "generateQr", url });
          };

          // Send button logic
          sendBtn.addEventListener("click", generateQrCode);

          // Add event listener for 'Enter' key press on the input field
          userInput.addEventListener("keydown", (event) => {
              if (event.key === "Enter") {
                  event.preventDefault(); // Prevent default form submission behavior
                  generateQrCode();
              }
          });

          // Listen for messages from extension
          window.addEventListener("message", (event) => {
              const message = event.data;
              if (message.type === "qrGenerated") {
                  const img = document.createElement("img");
                  img.src = message.value;
                  img.style.maxWidth = "100%";
                  const container = document.getElementById("qrContainer");
                  container.innerHTML = "";
                  container.appendChild(img);
              }
          });

          // Toggle IP visibility
          visibilityBtn.addEventListener("click", () => {
              if (isHidden) {
                  ipValueDiv.textContent = realIp;
                  visibilityBtn.innerHTML = "<i>visibility</i>";
                  isHidden = false;
              } else {
                  ipValueDiv.textContent = maskedIp;
                  visibilityBtn.innerHTML = "<i>visibility_off</i>";
                  isHidden = true;
              }
          });
        </script>
      </body>
      </html>
    `;
  }
}