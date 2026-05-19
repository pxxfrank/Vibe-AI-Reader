import { registerDocumentHandlers } from '../ipc/documents'
import { registerAiHandlers } from '../ipc/ai'
import { registerSettingsHandlers } from '../ipc/settings'
import { registerKnowledgeTreeHandlers } from '../ipc/knowledge-tree'

export function registerIpcHandlers(): void {
  registerDocumentHandlers()
  registerAiHandlers()
  registerSettingsHandlers()
  registerKnowledgeTreeHandlers()
}
