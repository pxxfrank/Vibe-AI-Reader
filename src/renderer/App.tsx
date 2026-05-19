import { HashRouter, Routes, Route } from 'react-router-dom'
import { MainLayout } from '@/components/layout/MainLayout'
import { LibraryView } from '@/components/library/LibraryView'
import { ReaderView } from '@/components/reader/ReaderView'
import { SettingsView } from '@/components/settings/SettingsView'

export default function App() {
  return (
    <HashRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<LibraryView />} />
          <Route path="/read/:documentId" element={<ReaderView />} />
          <Route path="/settings" element={<SettingsView />} />
        </Routes>
      </MainLayout>
    </HashRouter>
  )
}
