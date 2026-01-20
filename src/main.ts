import { App, Editor, MarkdownView, Plugin, TFile, getAllTags } from 'obsidian';
import { SpellcheckControlSettingTab } from "./settings";
import { DEFAULT_SETTINGS, SpellcheckControlSettings, Rule, RuleType } from "./types";

export default class SpellcheckControlPlugin extends Plugin {
	settings: SpellcheckControlSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new SpellcheckControlSettingTab(this.app, this));

		this.registerEvent(this.app.workspace.on('active-leaf-change', () => {
			 this.checkAndApplySpellcheck();
		}));
		
		this.registerEvent(this.app.workspace.on('file-open', () => {
			this.checkAndApplySpellcheck();
		}));
		
		this.app.workspace.onLayoutReady(() => {
			this.checkAndApplySpellcheck();
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.checkAndApplySpellcheck();
	}

	async checkAndApplySpellcheck() {
		const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeLeaf) return;

		const file = activeLeaf.file;
		if (!file) return;

		let decision: boolean | null = null;
		
		// Evaluate rules. First match wins.
		for (const rule of this.settings.rules) {
			if (!rule.enabled) continue;
			
			let match = false;
			try {
				match = await this.evaluateRule(file, rule);
			} catch (e) {
				console.error("Error evaluating rule", rule.name, e);
			}

			if (match) {
				decision = rule.enableSpellcheck;
				break; 
			}
		}

		// If a rule matched, apply it. Otherwise ensure default (True).
		// Note: We assume default is True because Obsidian usually has it on.
		// If we want to strictly respect global settings when no rule matches, we would need to read global config.
		// For now, we default to 'true' if no rule is matched, to reset any previous 'false' state.
		if (decision !== null) {
			this.setSpellcheck(activeLeaf, decision);
		} else {
			this.setSpellcheck(activeLeaf, true);
		}
	}

	setSpellcheck(view: MarkdownView, enabled: boolean) {
		const contentEl = view.contentEl.querySelector('.cm-content');
		if (contentEl) {
			contentEl.setAttribute('spellcheck', enabled ? 'true' : 'false');
		}
	}

	async evaluateRule(file: TFile, rule: Rule): Promise<boolean> {
		let match = false;
		switch (rule.type) {
			case RuleType.Folder:
				match = this.evaluateFolderRule(file, rule);
				break;
			case RuleType.Tag:
				match = this.evaluateTagRule(file, rule);
				break;
			case RuleType.Property:
				match = this.evaluatePropertyRule(file, rule);
				break;
			case RuleType.Dataview:
				match = await this.evaluateDataviewRule(file, rule);
				break;
		}
		
		if (rule.negated) return !match;
		return match;
	}

	evaluateFolderRule(file: TFile, rule: Rule): boolean {
		const rulePath = rule.path || '';
		if (rulePath === '/' || rulePath === '') {
			if (rule.recursive) return true;
			return file.parent?.path === '/';
		}
		
		if (rule.recursive) {
			return file.path.startsWith(rulePath);
		} else {
			 const parentPath = file.parent ? file.parent.path + '/' : '';
			 // Ensure trailing slash on rulePath for comparison if it's a folder
			 const normalizedRulePath = rulePath.endsWith('/') ? rulePath : rulePath + '/';
			 return parentPath === normalizedRulePath;
		}
	}

	evaluateTagRule(file: TFile, rule: Rule): boolean {
		const cache = this.app.metadataCache.getFileCache(file);
		if (!cache) return false;
		const tags = getAllTags(cache);
		if (!tags) return false;
		
		const ruleTag = '#' + (rule.tag?.replace(/^#/, '') || '');
		
		return tags.some(t => {
			if (rule.includeSubtags) {
				return t === ruleTag || t.startsWith(ruleTag + '/');
			} else {
				return t === ruleTag;
			}
		});
	}

	evaluatePropertyRule(file: TFile, rule: Rule): boolean {
		const cache = this.app.metadataCache.getFileCache(file);
		if (!cache || !cache.frontmatter) return false;
		
		const name = rule.propertyName;
		if (!name) return false; 
		
		const val = cache.frontmatter[name];
		if (val === undefined) return false;

		if (!rule.propertyValue || rule.propertyValue.trim() === '') return true; 

		const targetVal = rule.propertyValue;
		if (Array.isArray(val)) {
			return val.some(v => String(v) === targetVal);
		}
		return String(val) === targetVal;
	}

	async evaluateDataviewRule(file: TFile, rule: Rule): Promise<boolean> {
		 if (!rule.dataviewQuery) return false;
		 const dv = (this.app as any).plugins.plugins.dataview?.api;
		 if (!dv) return false;
		 
		 try {
			 const result = await dv.query(rule.dataviewQuery);
			 if (!result.successful) return false;
			 
			 for (const item of result.value.values) {
				 if (item.path === file.path) return true;
				 if (item.file?.path === file.path) return true; 
			 }
		 } catch(e) {
			 console.warn("Dataview query failed", e);
		 }
		 return false;
	}
}
