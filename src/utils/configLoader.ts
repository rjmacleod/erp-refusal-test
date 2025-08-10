import fs from 'fs/promises';
import path from 'path';

export interface ModelConfig {
  id: string;
  name: string;
  description: string;
}

export interface ProviderConfig {
  name: string;
  models: ModelConfig[];
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  purpose: string;
}

export interface Scenario {
  id: string;
  intensity: number;
  character: string;
  scenario: string;
  description: string;
  chat_history: string;
}

export interface TestConfiguration {
  providers: Record<string, ProviderConfig>;
  templates: PromptTemplate[];
  scenarios: Scenario[];
}

export class ConfigLoader {
  private configDir: string;

  constructor(configDir: string = './config') {
    this.configDir = configDir;
  }

  async loadConfiguration(): Promise<TestConfiguration> {
    const [modelsData, templatesData, scenariosData] = await Promise.all([
      this.loadJSON('models.json'),
      this.loadJSON('prompt-templates.json'), 
      this.loadJSON('scenarios.json')
    ]);

    return {
      providers: modelsData.providers,
      templates: templatesData.templates,
      scenarios: scenariosData.scenarios
    };
  }

  private async loadJSON(filename: string): Promise<any> {
    const filePath = path.join(this.configDir, filename);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }

  async getModelsByProvider(provider: string): Promise<ModelConfig[]> {
    const config = await this.loadConfiguration();
    return config.providers[provider]?.models || [];
  }

  async getScenariosByIntensity(intensity: number): Promise<Scenario[]> {
    const config = await this.loadConfiguration();
    return config.scenarios.filter(s => s.intensity === intensity);
  }

  async getScenariosByIntensityRange(minIntensity: number, maxIntensity: number): Promise<Scenario[]> {
    const config = await this.loadConfiguration();
    return config.scenarios.filter(s => s.intensity >= minIntensity && s.intensity <= maxIntensity);
  }

  formatPrompt(template: PromptTemplate, scenario: Scenario): string {
    return template.template
      .replace('{character}', scenario.character)
      .replace('{scenario}', scenario.scenario)
      .replace('{chat_history}', scenario.chat_history);
  }
}