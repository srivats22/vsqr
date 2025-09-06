import * as vscode from 'vscode';
import { SidebarProvider } from './SidebarProvider';

export function activate(context: vscode.ExtensionContext) {
  // Register the sidebar provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'vsqr-sidebar-view', // must match package.json
      new SidebarProvider(context)
    )
  );

  // Optional: add a command to open the sidebar
  context.subscriptions.push(
    vscode.commands.registerCommand('vsqr-sidebar.open', () => {
      vscode.commands.executeCommand('workbench.view.extension.vsqr-sidebar');
    })
  );
}

export function deactivate() {}