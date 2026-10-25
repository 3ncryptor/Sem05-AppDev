// A8 Students: filter and search accounts, add one, import a CSV, turn on/off, reset a password.
import { FileUp, Plus, RotateCw, Search, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Banner } from '../../../components/Banner.jsx'
import { Button } from '../../../components/Button.jsx'
import { Chip } from '../../../components/Chip.jsx'
import { Dialog } from '../../../components/Dialog.jsx'
import { EmptyState } from '../../../components/EmptyState.jsx'
import { Input } from '../../../components/Input.jsx'
import { Skeleton } from '../../../components/Skeleton.jsx'
import { Table } from '../../../components/Table.jsx'
import { useToast } from '../../../components/toastContext.js'
import { errorMessage } from '../../../lib/api.js'
import { useApi, useMutation } from '../../../lib/useApi.js'
import { AddStudentDialog } from './AddStudentDialog.jsx'
import { ImportDialog } from './ImportDialog.jsx'
import { PasswordDialog } from './PasswordDialog.jsx'
import { FILTERS, STUDENT_STATUS, lastActiveLabel, matchesSearch } from './studentsModel.js'
import styles from './Students.module.css'

const CONFIRM_COPY = {
  reset: (u) => ({
    title: `Reset ${u.name}'s password?`,
    description: 'Their old password stops working and they are signed out everywhere.',
    action: 'Reset password',
  }),
  off: (u) => ({
    title: `Turn off ${u.name}?`,
    description: 'They are signed out and cannot sign in until you turn the account back on.',
    action: 'Turn off',
  }),
}

function columns(nowMs, onAction) {
  return [
    { key: 'rollNo', label: 'Roll no', render: (u) => <span className={styles.mono}>{u.rollNo}</span> },
    { key: 'name', label: 'Name' },
    { key: 'status', label: 'Status', render: (u) => <Chip spec={u.active ? STUDENT_STATUS.active : STUDENT_STATUS.off} /> },
    { key: 'attempts', label: 'Attempts', align: 'right' },
    { key: 'lastActiveAt', label: 'Last active', render: (u) => lastActiveLabel(u.lastActiveAt, nowMs) },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (u) => (
        <div className={styles.rowActions}>
          <Button variant="ghost" onClick={() => onAction('reset', u)}>Reset password…</Button>
          {u.active ? (
            <Button variant="ghost" onClick={() => onAction('off', u)}>Turn off…</Button>
          ) : (
            <Button variant="ghost" onClick={() => onAction('on', u)}>Turn on</Button>
          )}
        </div>
      ),
    },
  ]
}

function LoadingRows() {
  return (
    <div className={styles.loading} aria-busy="true">
      {[0, 1, 2, 3, 4].map((key) => (
        <Skeleton key={key} height={36} />
      ))}
    </div>
  )
}

function FilterBar({ users, filter, onFilter, query, onQuery }) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.filters} role="group" aria-label="Filter students">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" className={styles.filter} aria-pressed={filter === f.id} onClick={() => onFilter(f.id)}>
            {f.label} <span className={styles.filterCount}>{users.filter(f.match).length}</span>
          </button>
        ))}
      </div>
      <div className={styles.search}>
        <Input
          label="Search students"
          hideLabel
          type="search"
          placeholder="Search roll no or name"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          trailing={<Search size={14} aria-hidden="true" />}
        />
      </div>
    </div>
  )
}

function useStudentActions(refetch, showPassword) {
  const toast = useToast()
  const update = useMutation('admin.users.update')
  const reset = useMutation('admin.users.resetPassword')

  const setActive = async (user, active) => {
    try {
      await update.run({ userId: user.id, active })
      toast(active ? `${user.name} can sign in again.` : `${user.name} is turned off.`, { tone: 'ok' })
      refetch()
    } catch (caught) {
      toast(errorMessage(caught), { tone: 'critical' })
    }
  }

  const resetPassword = async (user) => {
    try {
      const { password } = await reset.run({ userId: user.id })
      showPassword({ name: user.name, password })
    } catch (caught) {
      toast(errorMessage(caught), { tone: 'critical' })
    }
  }

  return { setActive, resetPassword, busy: update.loading || reset.loading }
}

export function StudentsPage() {
  const { data, error, loading, refetch } = useApi('admin.users.list')
  const [nowMs] = useState(() => Date.now())
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [shownPassword, setShownPassword] = useState(null)
  const actions = useStudentActions(refetch, setShownPassword)

  const users = data?.users ?? []
  const match = FILTERS.find((f) => f.id === filter).match
  const visible = users.filter((u) => match(u) && matchesSearch(u, query))

  const onAction = (kind, user) => (kind === 'on' ? actions.setActive(user, true) : setConfirm({ kind, user }))
  const runConfirmed = async () => {
    const { kind, user } = confirm
    await (kind === 'reset' ? actions.resetPassword(user) : actions.setActive(user, false))
    setConfirm(null)
  }
  const onCreated = ({ user, password }) => {
    refetch()
    if (password) setShownPassword({ name: user.name, password })
  }
  const confirmCopy = confirm ? CONFIRM_COPY[confirm.kind](confirm.user) : null

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Students</h1>
          <p className={styles.subtitle}>Accounts that can sign in and take exams.</p>
        </div>
        <div className={styles.headerActions}>
          <Button icon={FileUp} onClick={() => setDialog('import')}>Import from file</Button>
          <Button variant="primary" icon={Plus} onClick={() => setDialog('add')}>Add student</Button>
        </div>
      </header>
      {data && users.length > 0 && <FilterBar users={users} filter={filter} onFilter={setFilter} query={query} onQuery={setQuery} />}
      {loading && !data && <LoadingRows />}
      {error && (
        <Banner tone="critical" role="alert" action={<Button icon={RotateCw} onClick={refetch}>Retry</Button>}>
          {errorMessage(error)}
        </Banner>
      )}
      {data && users.length === 0 && (
        <EmptyState icon={UserRound} title="No students yet." action={<Button variant="primary" icon={Plus} onClick={() => setDialog('add')}>Add student</Button>}>
          Add one, or import a class from a CSV file.
        </EmptyState>
      )}
      {data && users.length > 0 && visible.length === 0 && <EmptyState>No students match. Try another search or filter.</EmptyState>}
      {visible.length > 0 && <Table caption="Students" columns={columns(nowMs, onAction)} rows={visible} rowKey={(u) => u.id} />}

      <AddStudentDialog open={dialog === 'add'} onClose={() => setDialog(null)} onCreated={onCreated} />
      <ImportDialog open={dialog === 'import'} onClose={() => setDialog(null)} onImported={refetch} />
      <PasswordDialog shown={shownPassword} onClose={() => setShownPassword(null)} />
      <Dialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirmCopy?.title ?? ''}
        description={confirmCopy?.description}
        footer={
          <>
            <Button onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={runConfirmed} loading={actions.busy}>{confirmCopy?.action}</Button>
          </>
        }
      />
    </div>
  )
}
