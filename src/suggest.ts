import { App } from "obsidian";

export class MultiSuggest {
    private containerEl: HTMLElement | null = null;
    
    constructor(
        private inputEl: HTMLInputElement | HTMLTextAreaElement, 
        private items: Set<string>, 
        private onSelect: (value: string) => void, 
        private app: App
    ) {
        this.inputEl.addEventListener('input', this.onInput.bind(this));
        this.inputEl.addEventListener('blur', () => setTimeout(() => this.close(), 200));
    }

    onInput() {
        const val = this.inputEl.value.toLowerCase();
        // If empty, maybe show all? Or none. Let's show none.
        if(!val) { this.close(); return; }
        const matches = Array.from(this.items).filter(i => i.toLowerCase().includes(val));
        if(matches.length > 0) this.open(matches);
        else this.close();
    }

    open(matches: string[]) {
        this.close();
        this.containerEl = document.body.createDiv('suggestion-container');
        const rect = this.inputEl.getBoundingClientRect();
        this.containerEl.setCssStyles({
            position: 'fixed',
            top: `${rect.bottom}px`,
            left: `${rect.left}px`,
            width: `${rect.width}px`,
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 'var(--layer-menu)',
            backgroundColor: 'var(--background-secondary)',
            border: '1px solid var(--background-modifier-border)'
        });
        
        matches.slice(0, 50).forEach(m => { // Limit to 50
            const item = this.containerEl!.createDiv('suggestion-item');
            item.setText(m);
            item.style.padding = '4px 8px';
            item.style.cursor = 'pointer';
            item.addEventListener('mouseenter', () => item.style.backgroundColor = 'var(--background-modifier-hover)');
            item.addEventListener('mouseleave', () => item.style.backgroundColor = '');
            item.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.onSelect(m);
                this.close();
            });
        });
    }

    close() {
        if(this.containerEl) {
            this.containerEl.remove();
            this.containerEl = null;
        }
    }
}
