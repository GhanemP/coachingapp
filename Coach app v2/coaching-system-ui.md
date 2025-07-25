# UI Components Specification

## Overview
Complete UI/UX component specifications for the Coaching Performance Management System. All components use TypeScript, React, and Tailwind CSS.

## Design System

### Color Palette
```typescript
// AI Context: Tailwind color classes for consistency
const colors = {
  primary: {
    50: 'blue-50',
    500: 'blue-500',
    700: 'blue-700'
  },
  success: {
    50: 'green-50',
    500: 'green-500',
    700: 'green-700'
  },
  warning: {
    50: 'yellow-50',
    500: 'yellow-500',
    700: 'yellow-700'
  },
  danger: {
    50: 'red-50',
    500: 'red-500',
    700: 'red-700'
  },
  neutral: {
    50: 'gray-50',
    200: 'gray-200',
    500: 'gray-500',
    800: 'gray-800'
  }
};
```

### Typography
```typescript
const typography = {
  heading: {
    h1: 'text-3xl font-bold text-gray-900',
    h2: 'text-2xl font-semibold text-gray-800',
    h3: 'text-xl font-semibold text-gray-800',
    h4: 'text-lg font-medium text-gray-700'
  },
  body: {
    large: 'text-lg text-gray-700',
    base: 'text-base text-gray-700',
    small: 'text-sm text-gray-600',
    tiny: 'text-xs text-gray-500'
  }
};
```

### Spacing System
```typescript
const spacing = {
  xs: 'p-1',   // 4px
  sm: 'p-2',   // 8px
  md: 'p-4',   // 16px
  lg: 'p-6',   // 24px
  xl: 'p-8',   // 32px
  '2xl': 'p-12' // 48px
};
```

## Core Components

### Layout Components

#### AppLayout
```tsx
// AI Context: Main application wrapper with navigation
interface AppLayoutProps {
  children: React.ReactNode;
  user: User;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, user }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation user={user} />
      <div className="flex">
        <SideNavigation role={user.role} />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
```

#### TopNavigation
```tsx
interface TopNavigationProps {
  user: User;
}

const TopNavigation: React.FC<TopNavigationProps> = ({ user }) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Logo />
          <SearchBar />
        </div>
        <div className="flex items-center space-x-4">
          <NotificationBell />
          <QuickActions role={user.role} />
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
};
```

### Dashboard Components

#### TeamLeaderDashboard
```tsx
// AI Context: Main dashboard for team leaders
interface TeamLeaderDashboardProps {
  teamLeader: User;
  metrics: DashboardMetrics;
}

const TeamLeaderDashboard: React.FC<TeamLeaderDashboardProps> = ({ 
  teamLeader, 
  metrics 
}) => {
  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {teamLeader.name}!
        </h1>
        <p className="text-gray-600 mt-1">
          Here's your team's performance overview
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Agents Needing Coaching"
          value={metrics.agentsNeedingCoaching}
          trend={metrics.coachingTrend}
          icon={<UsersIcon />}
          color="warning"
        />
        <StatCard
          title="Active PIPs"
          value={metrics.activeActionPlans}
          icon={<ClipboardIcon />}
          color="danger"
        />
        <StatCard
          title="Pending Actions"
          value={metrics.pendingActions}
          icon={<TaskIcon />}
          color="primary"
        />
        <StatCard
          title="Team Average"
          value={`${metrics.teamAverage}%`}
          trend={metrics.teamTrend}
          icon={<ChartIcon />}
          color="success"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PriorityQueue agents={metrics.priorityAgents} />
        <RecentNotes notes={metrics.recentNotes} />
      </div>

      {/* Team Performance Chart */}
      <TeamPerformanceChart data={metrics.performanceHistory} />
    </div>
  );
};
```

#### PriorityQueue
```tsx
interface PriorityQueueProps {
  agents: PriorityAgent[];
}

const PriorityQueue: React.FC<PriorityQueueProps> = ({ agents }) => {
  return (
    <Card title="Coaching Priority Queue" icon={<AlertIcon />}>
      <div className="space-y-3">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center space-x-4">
              <UrgencyIndicator score={agent.urgencyScore} />
              <div>
                <p className="font-medium text-gray-900">{agent.name}</p>
                <p className="text-sm text-gray-600">{agent.primaryIssue}</p>
                <p className="text-xs text-gray-500">
                  Last coached: {agent.daysSinceCoaching} days ago
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="primary"
                onClick={() => navigateToPrep(agent.id)}
              >
                Prep Session
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => openQuickNote(agent.id)}
              >
                Add Note
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
```

### Coaching Components

#### CoachingPrepScreen
```tsx
interface CoachingPrepScreenProps {
  session: CoachingSession;
  agent: Agent;
  prepData: SessionPrepData;
}

const CoachingPrepScreen: React.FC<CoachingPrepScreenProps> = ({
  session,
  agent,
  prepData
}) => {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Coaching Prep: {agent.name}
            </h1>
            <p className="text-gray-600 mt-1">
              Scheduled for {formatDate(session.scheduledDate)}
            </p>
          </div>
          <div className="flex space-x-3">
            <Button variant="secondary" onClick={handleReschedule}>
              Reschedule
            </Button>
            <Button variant="primary" onClick={handleStartSession}>
              Start Session
            </Button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Analysis */}
        <Card title="Performance Analysis">
          <PerformanceTrendChart data={prepData.performanceTrends} />
          <div className="mt-4 space-y-2">
            <MetricRow
              label="Current Composite Score"
              value={prepData.currentMetrics.compositeScore}
              trend={prepData.trends.composite}
            />
            <MetricRow
              label="Weakest Area"
              value={prepData.weakestArea.name}
              score={prepData.weakestArea.score}
              trend={prepData.weakestArea.trend}
            />
          </div>
        </Card>

        {/* Coaching Intelligence */}
        <Card title="Coaching Intelligence">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                What Works for {agent.name}:
              </h4>
              <ul className="space-y-1">
                {prepData.effectiveMethods.map((method) => (
                  <li key={method} className="flex items-center text-sm">
                    <CheckIcon className="text-green-500 mr-2" />
                    {method}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                Root Cause Analysis:
              </h4>
              <p className="text-sm text-gray-600">
                {prepData.rootCauseAnalysis}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Agenda Section */}
      <Card title="Session Agenda" icon={<ClipboardIcon />}>
        <AgendaBuilder
          items={prepData.suggestedAgenda}
          onUpdate={handleAgendaUpdate}
        />
      </Card>

      {/* Unaddressed Notes */}
      <Card title="Unaddressed Notes" badge={prepData.unaddressedNotes.length}>
        <NotesList
          notes={prepData.unaddressedNotes}
          onLink={handleLinkNote}
        />
      </Card>
    </div>
  );
};
```

#### LiveSessionInterface
```tsx
interface LiveSessionInterfaceProps {
  session: CoachingSession;
  agent: Agent;
}

const LiveSessionInterface: React.FC<LiveSessionInterfaceProps> = ({
  session,
  agent
}) => {
  const [notes, setNotes] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const { timer, start, pause } = useTimer();

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="font-medium text-gray-900">LIVE SESSION</span>
          </div>
          <span className="text-gray-600">{agent.name}</span>
          <Timer time={timer} />
        </div>
        <div className="flex space-x-3">
          <Button variant="secondary" onClick={pause}>
            Pause
          </Button>
          <Button variant="danger" onClick={handleEndSession}>
            End Session
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Agenda & Topics */}
        <div className="w-1/3 bg-white border-r border-gray-200 p-6 overflow-y-auto">
          <h3 className="font-semibold text-gray-900 mb-4">
            Discussion Topics
          </h3>
          <TopicChecklist
            topics={session.agendaItems}
            completed={topics}
            onToggle={handleTopicToggle}
          />
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={handleAddTopic}
          >
            + Add Topic
          </Button>
        </div>

        {/* Center Panel - Notes */}
        <div className="flex-1 bg-white p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            Session Notes
          </h3>
          <AutoSaveTextarea
            value={notes}
            onChange={setNotes}
            placeholder="Type your notes here... (auto-saving)"
            className="w-full h-96 p-4 border border-gray-300 rounded-lg"
            autoSaveDelay={5000}
            onAutoSave={handleAutoSave}
          />
          <div className="mt-4 flex items-center text-sm text-gray-500">
            <CheckIcon className="mr-1" />
            Auto-saved {formatTime(lastSaved)}
          </div>
        </div>

        {/* Right Panel - Actions & Scoring */}
        <div className="w-1/3 bg-white border-l border-gray-200 p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Action Items */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">
                Action Items
              </h3>
              <ActionItemsList
                items={session.actionItems}
                onAdd={handleAddAction}
                onUpdate={handleUpdateAction}
              />
            </div>

            {/* Real-time Scoring */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">
                Session Scoring
              </h3>
              <div className="space-y-3">
                <ScoreSlider
                  label="Engagement"
                  value={scores.engagement}
                  onChange={(v) => updateScore('engagement', v)}
                />
                <ScoreSlider
                  label="Understanding"
                  value={scores.understanding}
                  onChange={(v) => updateScore('understanding', v)}
                />
                <ScoreSlider
                  label="Commitment"
                  value={scores.commitment}
                  onChange={(v) => updateScore('commitment', v)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
```

### Quick Note Components

#### QuickNoteButton
```tsx
// AI Context: Floating action button always visible
const QuickNoteButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-50"
        title="Quick Note (Ctrl+N)"
      >
        <PlusIcon className="w-6 h-6" />
      </button>
      
      {isOpen && (
        <QuickNoteModal onClose={() => setIsOpen(false)} />
      )}
    </>
  );
};
```

#### QuickNoteModal
```tsx
interface QuickNoteModalProps {
  onClose: () => void;
}

const QuickNoteModal: React.FC<QuickNoteModalProps> = ({ onClose }) => {
  const [formData, setFormData] = useState<QuickNoteForm>({
    agentId: '',
    noteType: 'GENERAL',
    category: '',
    content: '',
    priority: 'MEDIUM'
  });

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Quick Note"
      size="medium"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Agent Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Agent *
          </label>
          <AgentSearchSelect
            value={formData.agentId}
            onChange={(id) => updateForm('agentId', id)}
            placeholder="Start typing agent name..."
            required
          />
        </div>

        {/* Note Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Note Type *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {noteTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => updateForm('noteType', type.value)}
                className={`
                  px-4 py-2 rounded-lg border-2 transition-all
                  ${formData.noteType === type.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <span className="flex items-center justify-center">
                  {type.icon}
                  <span className="ml-2">{type.label}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category *
          </label>
          <select
            value={formData.category}
            onChange={(e) => updateForm('category', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            required
          >
            <option value="">Select category...</option>
            <option value="Call Quality">Call Quality</option>
            <option value="Customer Service">Customer Service</option>
            <option value="Technical Knowledge">Technical Knowledge</option>
            <option value="Attendance">Attendance</option>
            <option value="Team Collaboration">Team Collaboration</option>
          </select>
        </div>

        {/* Note Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Note * <span className="text-gray-500">({formData.content.length}/500)</span>
          </label>
          <textarea
            value={formData.content}
            onChange={(e) => updateForm('content', e.target.value)}
            placeholder="Describe the observation..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg h-24 resize-none"
            maxLength={500}
            required
          />
          <VoiceInputButton onTranscript={handleVoiceInput} />
        </div>

        {/* Priority */}
        {formData.noteType === 'URGENT' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <PrioritySelector
              value={formData.priority}
              onChange={(p) => updateForm('priority', p)}
            />
          </div>
        )}

        {/* Options */}
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.linkToSession}
              onChange={(e) => updateForm('linkToSession', e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">
              Link to next coaching session
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            Save Note
          </Button>
        </div>
      </form>
    </Modal>
  );
};
```

### Data Display Components

#### DataTable
```tsx
interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  sorting?: boolean;
  pagination?: boolean;
  pageSize?: number;
}

const DataTable = <T extends Record<string, any>>({
  columns,
  data,
  onRowClick,
  sorting = true,
  pagination = true,
  pageSize = 10
}: DataTableProps<T>) => {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`
                    px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
                    ${sorting && column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''}
                  `}
                  onClick={() => sorting && column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.header}</span>
                    {sorting && column.sortable && (
                      <SortIndicator
                        field={column.key}
                        sortConfig={sortConfig}
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.map((row, index) => (
              <tr
                key={index}
                className={`
                  ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
                `}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                    {column.render
                      ? column.render(row[column.key], row)
                      : row[column.key]
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {pagination && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
};
```

#### MetricCard
```tsx
interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'stable';
  };
  icon?: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'danger';
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  trend,
  icon,
  color = 'primary'
}) => {
  const colorClasses = {
    primary: 'bg-blue-50 text-blue-700 border-blue-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    danger: 'bg-red-50 text-red-700 border-red-200'
  };

  return (
    <div className={`
      rounded-lg border-2 p-6 transition-all hover:shadow-md
      ${colorClasses[color]}
    `}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
          {trend && (
            <div className="flex items-center mt-2 text-sm">
              <TrendIcon direction={trend.direction} />
              <span className="ml-1">
                {trend.value}% from last period
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className="opacity-20">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};
```

### Form Components

#### FormField
```tsx
interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  help?: string;
  children: React.ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  required,
  error,
  help,
  children
}) => {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {help && !error && (
        <p className="text-xs text-gray-500">{help}</p>
      )}
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
};
```

#### Button
```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  onClick,
  type = 'button',
  children
}) => {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-medium rounded-lg
        transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {loading && <Spinner className="mr-2" />}
      {children}
    </button>
  );
};
```

### Chart Components

#### PerformanceTrendChart
```tsx
interface PerformanceTrendChartProps {
  data: TrendData[];
  metrics: string[];
  height?: number;
}

const PerformanceTrendChart: React.FC<PerformanceTrendChartProps> = ({
  data,
  metrics,
  height = 300
}) => {
  return (
    <div className="bg-white p-4 rounded-lg">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickFormatter={formatDate}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e0e0e0',
              borderRadius: '8px'
            }}
          />
          <Legend />
          {metrics.map((metric, index) => (
            <Line
              key={metric}
              type="monotone"
              dataKey={metric}
              stroke={CHART_COLORS[index]}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
```

### Utility Components

#### Modal
```tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: 'small' | 'medium' | 'large' | 'full';
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'medium',
  children
}) => {
  if (!isOpen) return null;

  const sizes = {
    small: 'max-w-md',
    medium: 'max-w-lg',
    large: 'max-w-3xl',
    full: 'max-w-6xl'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-black opacity-50"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className={`
          relative bg-white rounded-lg shadow-xl
          ${sizes[size]} w-full
        `}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="px-6 py-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
```

#### Toast
```tsx
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({
  message,
  type,
  duration = 5000,
  onClose
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const types = {
    success: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      icon: <CheckCircleIcon className="w-5 h-5" />
    },
    error: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      icon: <XCircleIcon className="w-5 h-5" />
    },
    warning: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      icon: <ExclamationIcon className="w-5 h-5" />
    },
    info: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      icon: <InformationCircleIcon className="w-5 h-5" />
    }
  };

  return (
    <div className={`
      fixed bottom-4 right-4 z-50
      flex items-center p-4 rounded-lg shadow-lg
      ${types[type].bg} ${types[type].text}
      transform transition-all duration-300
    `}>
      <div className="mr-3">{types[type].icon}</div>
      <p className="font-medium">{message}</p>
      <button
        onClick={onClose}
        className="ml-4 hover:opacity-70"
      >
        <XIcon className="w-4 h-4" />
      </button>
    </div>
  );
};
```

## Responsive Design

### Breakpoints
```typescript
const breakpoints = {
  sm: '640px',   // Mobile
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Large Desktop
  '2xl': '1536px' // Extra Large
};
```

### Mobile Adaptations
- Navigation: Hamburger menu on mobile
- Tables: Horizontal scroll on small screens
- Grid layouts: Stack on mobile (grid-cols-1)
- Modals: Full screen on mobile
- Buttons: Full width on mobile when appropriate

## Accessibility

### ARIA Labels
```tsx
// All interactive elements must have proper labels
<button aria-label="Add quick note">
  <PlusIcon aria-hidden="true" />
</button>

// Form inputs with associated labels
<label htmlFor="agent-select">Select Agent</label>
<select id="agent-select" aria-required="true">
```

### Keyboard Navigation
- All interactive elements accessible via Tab
- Modal close on Escape key
- Form submission on Enter
- Dropdown navigation with arrow keys

### Color Contrast
- All text meets WCAG AA standards
- Important information not conveyed by color alone
- Focus indicators visible on all interactive elements

---

**AI Development Note**: When implementing these components, use the design system tokens for consistency. All components should be fully typed with TypeScript interfaces. Consider creating a Storybook for component documentation and testing.