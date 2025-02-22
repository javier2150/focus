// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { exec } from 'child_process';

let previousInputSource: string | null = null;

// Set English input source
function setEnglishInputSource() {
	exec('defaults write com.apple.HIToolbox AppleCurrentKeyboardLayoutInputSourceID "com.apple.keylayout.ABC"');
	exec('defaults write com.apple.HIToolbox AppleSelectedInputSources -array \'<dict><key>InputSourceKind</key><string>Keyboard Layout</string><key>KeyboardLayout ID</key><integer>252</integer><key>KeyboardLayout Name</key><string>ABC</string></dict>\'');
}

// Restore previous input source
function restorePreviousInputSource() {
	if (previousInputSource) {
		exec(`defaults write com.apple.HIToolbox AppleCurrentKeyboardLayoutInputSourceID "${previousInputSource}"`);
	}
}

// Get current input source
function getCurrentInputSource(callback: (inputSource: string) => void) {
	exec('defaults read com.apple.HIToolbox AppleCurrentKeyboardLayoutInputSourceID', (error, stdout) => {
		if (!error) {
			callback(stdout.trim());
		}
	});
}

let mouseClickDisposable: vscode.Disposable | null = null;

// Check if Vim plugin is enabled
function isVimEnabled(): boolean {
	return vscode.workspace.getConfiguration('vim').get('enabled', false);
}

let lastValidSelection: vscode.Selection | null = null;

// Handle mouse click event
function handleMouseClick(e: vscode.TextEditorSelectionChangeEvent) {
    if (isVimEnabled()) {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            if (!lastValidSelection) {
                lastValidSelection = editor.selection;
            }
            // Restore to the last valid cursor position
            editor.selection = lastValidSelection;
            // Show notification message
            vscode.window.showInformationMessage('In Vim mode, please use keyboard commands for navigation instead of mouse clicks.');
        }
    } else {
        // If Vim is not enabled, update lastValidSelection
        lastValidSelection = e.selections[0];
    }
}

// Update mouse click handler
function updateMouseClickHandler() {
	// If disposable exists, clean it up first
	if (mouseClickDisposable) {
		mouseClickDisposable.dispose();
		mouseClickDisposable = null;
	}

	// If Vim is enabled, add mouse click handler
	if (isVimEnabled()) {
		mouseClickDisposable = vscode.window.onDidChangeTextEditorSelection(handleMouseClick);
	}
}

export function activate(context: vscode.ExtensionContext) {
	console.log('Focus extension is now active!');

	// Get and save current input source
	getCurrentInputSource((inputSource) => {
		previousInputSource = inputSource;
		// Set to English input source
		setEnglishInputSource();
	});

	// Listen for window focus changes
	const focusDisposable = vscode.window.onDidChangeWindowState((e) => {
		if (e.focused) {
			// Switch to English input source when VSCode window gains focus
			setEnglishInputSource();
		} else {
			// Restore previous input source when VSCode window loses focus
			restorePreviousInputSource();
		}
	});

	// Initialize mouse click handler
	updateMouseClickHandler();

	// Listen for Vim configuration changes
	const vimConfigDisposable = vscode.workspace.onDidChangeConfiguration(e => {
		if (e.affectsConfiguration('vim')) {
			updateMouseClickHandler();
		}
	});

	context.subscriptions.push(focusDisposable, vimConfigDisposable);

	// If mouseClickDisposable exists, add it to subscriptions
	if (mouseClickDisposable) {
		context.subscriptions.push(mouseClickDisposable);
	}
}

export function deactivate() {
	// Restore previous input source when plugin is deactivated
	restorePreviousInputSource();
}
