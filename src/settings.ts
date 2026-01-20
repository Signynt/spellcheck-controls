import { App, PluginSettingTab, Setting, debounce, getAllTags, TFolder } from "obsidian";
import MyPlugin from "./main";
import { Rule, RuleType, SpellcheckControlSettings } from "./types";
import { MultiSuggest } from "./suggest";

export class SpellcheckControlSettingTab extends PluginSettingTab {
	plugin: MyPlugin;
	ruleExpandedStates: boolean[] = [];

	// Caches
	allFolderPathsCache: Set<string> | null = null;
	allTagsCache: Set<string> | null = null;
	allPropertyNamesCache: Set<string> | null = null;

	debouncedSave: () => void;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.debouncedSave = debounce(this.save.bind(this), 500, false);
	}

	save() {
		this.plugin.saveSettings();
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Spellcheck Control Settings' });
		containerEl.createEl('p', { text: 'Define rules to enable or disable spellcheck based on folder, tags, or properties.' });

		containerEl.createEl('h3', { text: 'Rules' });

		this.allFolderPathsCache = null;
		this.allTagsCache = null;
		this.allPropertyNamesCache = null;

		const numRules = this.plugin.settings.rules.length;
		while (this.ruleExpandedStates.length < numRules) {
			this.ruleExpandedStates.push(false);
		}
		if (this.ruleExpandedStates.length > numRules) {
			this.ruleExpandedStates.length = numRules;
		}

		const rulesContainer = containerEl.createDiv('rules-container');

		this.plugin.settings.rules.forEach((rule, index) => {
			this.renderRuleControls(rule, index, rulesContainer);
		});

		new Setting(containerEl)
			.addButton(button => button
				.setButtonText('Add new rule')
				.setCta()
				.onClick(async () => {
				   const newRule: Rule = {
						name: 'New Rule',
						enabled: true,
						type: RuleType.Folder,
						enableSpellcheck: false,
						path: '',
						recursive: true
					};
					this.plugin.settings.rules.push(newRule);
					this.ruleExpandedStates.push(true);
					await this.plugin.saveSettings();
					this.display();
				}));
	}

	private renderRuleControls(rule: Rule, index: number, containerEl: HTMLElement): void {
		const ruleDiv = containerEl.createDiv('rule-item');
		ruleDiv.style.border = '1px solid var(--background-modifier-border)';
		ruleDiv.style.padding = '10px';
		ruleDiv.style.marginBottom = '10px';
		ruleDiv.style.borderRadius = '4px';

		if (!this.ruleExpandedStates[index]) {
			ruleDiv.addClass('is-collapsed');
		}

		const ruleNameDisplay = (rule.name && rule.name.trim() !== '') ? rule.name : 'Unnamed Rule';
		const ruleHeading = ruleDiv.createEl('h4', { text: `Rule ${index + 1}: ${ruleNameDisplay}` });
		ruleHeading.style.cursor = 'pointer';
		ruleHeading.style.marginTop = '0';

		const ruleContentContainer = ruleDiv.createDiv('rule-content');
		if (!this.ruleExpandedStates[index]) {
			ruleContentContainer.style.display = 'none';
		}

		ruleHeading.addEventListener('click', () => {
			const isNowExpanded = !this.ruleExpandedStates[index];
			this.ruleExpandedStates[index] = isNowExpanded;
			ruleContentContainer.style.display = isNowExpanded ? 'block' : 'none';
		});

		// Rule Name
		new Setting(ruleContentContainer)
			.setName('Rule name')
			.addText(text => text
				.setValue(rule.name || '')
				.onChange((value) => {
					rule.name = value;
					ruleHeading.setText(`Rule ${index + 1}: ${(value && value.trim() !== '') ? value : 'Unnamed Rule'}`);
					this.debouncedSave();
				}));
		
		// Enabled
		new Setting(ruleContentContainer)
			.setName('Enabled')
			.addToggle(toggle => toggle
				.setValue(rule.enabled)
				.onChange(async (value) => {
					rule.enabled = value;
					await this.plugin.saveSettings();
				}));

		// Rule Type
		new Setting(ruleContentContainer)
			.setName('Rule type')
			.addDropdown(dropdown => dropdown
				.addOption(RuleType.Folder, 'Folder')
				.addOption(RuleType.Tag, 'Tag')
				.addOption(RuleType.Property, 'Property')
				.addOption(RuleType.Dataview, 'Dataview')
				.setValue(rule.type)
				.onChange(async (value: string) => {
					rule.type = value as RuleType;
					await this.plugin.saveSettings();
					this.display();
				}));

		// Type Specifics
		if (rule.type === RuleType.Folder) {
			new Setting(ruleContentContainer)
				.setName('Condition')
				.addDropdown(d => d.addOption('is', 'is').addOption('not', 'not').setValue(rule.negated ? 'not' : 'is').onChange(async v => { rule.negated = v === 'not'; await this.plugin.saveSettings(); }));
				
			new Setting(ruleContentContainer)
				.setName('Folder path')
				.addText(text => {
					text.setValue(rule.path || '').onChange(v => { rule.path = v; this.debouncedSave(); });
					new MultiSuggest(text.inputEl, this.getAvailableFolderPaths(), (v) => { rule.path = v; text.setValue(v); this.plugin.saveSettings(); }, this.plugin.app);
				});
			 new Setting(ruleContentContainer)
				.setName('Include subfolders')
				.addToggle(t => t.setValue(rule.recursive !== false).onChange(async v => { rule.recursive = v; await this.plugin.saveSettings(); }));

		} else if (rule.type === RuleType.Tag) {
			 new Setting(ruleContentContainer)
				.setName('Condition')
				.addDropdown(d => d.addOption('is', 'is').addOption('not', 'not').setValue(rule.negated ? 'not' : 'is').onChange(async v => { rule.negated = v === 'not'; await this.plugin.saveSettings(); }));

			new Setting(ruleContentContainer)
				.setName('Tag')
				.addText(text => {
					text.setValue(rule.tag || '').onChange(v => { rule.tag = v; this.debouncedSave(); });
					new MultiSuggest(text.inputEl, this.getAvailableTags(), (v) => { rule.tag = v; text.setValue(v); this.plugin.saveSettings(); }, this.plugin.app);
				});
		} else if (rule.type === RuleType.Property) {
			 new Setting(ruleContentContainer)
				.setName('Condition')
				.addDropdown(d => d.addOption('is', 'is').addOption('not', 'not').setValue(rule.negated ? 'not' : 'is').onChange(async v => { rule.negated = v === 'not'; await this.plugin.saveSettings(); }));

			new Setting(ruleContentContainer)
				.setName('Property Name')
				.addText(text => {
					text.setValue(rule.propertyName || '').onChange(v => { rule.propertyName = v; this.debouncedSave(); });
					new MultiSuggest(text.inputEl, this.getAvailablePropertyNames(), (v) => { rule.propertyName = v; text.setValue(v); this.plugin.saveSettings(); }, this.plugin.app);
				});
			 new Setting(ruleContentContainer)
				.setName('Property Value')
				.addText(text => text.setValue(rule.propertyValue || '').onChange(v => { rule.propertyValue = v; this.debouncedSave(); }));
		} else if (rule.type === RuleType.Dataview) {
			 new Setting(ruleContentContainer)
				.setName('Dataview Query')
				.setDesc('LIST query')
				.addTextArea(text => text.setValue(rule.dataviewQuery || '').onChange(v => { rule.dataviewQuery = v; this.debouncedSave(); }));
		}

		// Result: Enable Spellcheck
		new Setting(ruleContentContainer)
			.setName('Enable Spellcheck')
			.setDesc('If this rule matches, should spellcheck be enabled or disabled?')
			.addToggle(toggle => toggle
				.setValue(rule.enableSpellcheck)
				.onChange(async (value) => {
					rule.enableSpellcheck = value;
					await this.plugin.saveSettings();
				}));
		
		// Delete
		new Setting(ruleContentContainer)
			.addButton(button => button
				.setButtonText('Delete Rule')
				.setWarning()
				.onClick(async () => {
					this.plugin.settings.rules.splice(index, 1);
					this.ruleExpandedStates.splice(index, 1);
					await this.plugin.saveSettings();
					this.display();
				}));
	}

	getAvailableFolderPaths(): Set<string> {
		if (this.allFolderPathsCache) return this.allFolderPathsCache;
		const folders = new Set<string>();
		folders.add('/');
		this.app.vault.getAllLoadedFiles().forEach(file => {
			 if (file instanceof TFolder) {
				 folders.add(file.path + '/');
			 }
		});
		this.allFolderPathsCache = folders;
		return folders;
	}

	getAvailableTags(): Set<string> {
		if (this.allTagsCache) return this.allTagsCache;
		const tags = new Set<string>();
		this.app.vault.getMarkdownFiles().forEach(file => {
			 const cache = this.app.metadataCache.getFileCache(file);
			 if(cache && cache.tags) {
				 cache.tags.forEach(tag => tags.add(tag.tag));
			 }
		});
		this.allTagsCache = tags;
		return tags;
	}

	getAvailablePropertyNames(): Set<string> {
		if (this.allPropertyNamesCache) return this.allPropertyNamesCache;
		const props = new Set<string>();
		 const cache = this.app.metadataCache as any;
		 if(cache.getAllPropertyInfos) {
			 const infos = cache.getAllPropertyInfos();
			 Object.keys(infos).forEach(k => props.add(k));
		 }
		this.allPropertyNamesCache = props;
		return props;
	}
}
