export enum RuleType {
	Folder = 'folder',
	Tag = 'tag',
	Property = 'property',
	Multi = 'multi',
	Dataview = 'dataview'
}

export interface SubCondition {
	type: 'folder' | 'tag' | 'property';
	negated?: boolean;
	path?: string;
	recursive?: boolean;
	tag?: string;
	includeSubtags?: boolean;
	propertyName?: string;
	propertyValue?: string;
}

export interface Rule {
	name: string;
	enabled: boolean;
	type: RuleType;
	
	// Result
	enableSpellcheck: boolean;

	// Common
	negated?: boolean;

	// Folder
	path?: string;
	recursive?: boolean;

	// Tag
	tag?: string;
	includeSubtags?: boolean;

	// Property
	propertyName?: string;
	propertyValue?: string;

	// Dataview
	dataviewQuery?: string;

	// Multi
	multiConditionLogic?: 'any' | 'all';
	conditions?: SubCondition[];
}

export interface SpellcheckControlSettings {
	rules: Rule[];
}

export const DEFAULT_SETTINGS: SpellcheckControlSettings = {
	rules: []
};
