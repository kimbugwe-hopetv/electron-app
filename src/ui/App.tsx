
import { Fragment, useEffect, useState } from 'react';
import './App.css';

type CollectionName =
  | 'efris_transactions'
  | 'tax_assessments'
  | 'tax_incentives_exemptions'
  | 'taxpayers';



function NestedData({ value }: { value: any }) {
  if (value === null || value === undefined) {
    return <span className="empty-value">—</span>;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="empty-value">No records</span>;
    }

    return (
      <div className="nested-list">
        {value.map((item, index) => (
          <div className="nested-item" key={index}>
            <div className="nested-item-title">
              Item {index + 1}
            </div>

            <NestedData value={item} />
          </div>
        ))}
      </div>
    );
  }

  // Handle objects
  if (typeof value === 'object') {
    const entries = Object.entries(value);

    if (entries.length === 0) {
      return <span className="empty-value">No data</span>;
    }

    return (
      <div className="nested-table">
        {entries.map(([key, item]) => (
          <div className="nested-row" key={key}>
            <div className="nested-label">
              {key.replace(/_/g, ' ')}
            </div>

            <div className="nested-value">
              <NestedData value={item} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Handle normal values
  if (typeof value === 'boolean') {
    return (
      <span className={value ? 'boolean-yes' : 'boolean-no'}>
        {value ? 'Yes' : 'No'}
      </span>
    );
  }

  return <span>{String(value)}</span>;
}


function App() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>(null);

  const [selectedCollection, setSelectedCollection] =
    useState<CollectionName>('taxpayers');

  const collections: CollectionName[] = [
    'efris_transactions',
    'tax_assessments',
    'tax_incentives_exemptions',
    'taxpayers'
  ];

  // Check MongoDB connection.
  async function testConnection() {
    const result = await window.databaseAPI.testConnection();

    setConnected(result.success);

    return result.success;
  }

  // Fetch database statistics.
  async function loadStatistics() {
    const result = await window.databaseAPI.getStatistics();

    if (result.success) {
      setStatistics(result.data);
    }
  }

  // Fetch selected collection.
  async function loadCollection(
    collection: CollectionName = selectedCollection
  ) {
    setLoading(true);

    try {
      const result =
        await window.databaseAPI.getCollection(collection);

      if (result.success) {
        setRecords(result.data);
      } else {
        alert(result.message);
        setRecords([]);
      }
    } catch (error) {
      console.error(error);
      setRecords([]);
    }

    setLoading(false);
  }

  // Initialize application.
  useEffect(() => {
    async function initialize() {
      const success = await testConnection();

      if (success) {
        await loadStatistics();
        await loadCollection();
      }
    }

    initialize();
  }, []);

  return (
    <div className="app">

      <header>
        <div>
          <h1>URA Tax Administration</h1>
          <p className="mg">MongoDB Database Dashboard</p>
        </div>

        <div className={connected ? 'connected' : 'disconnected'}>
          {connected ? '● MongoDB Connected' : '● Disconnected'}
        </div>
      </header>

      <section className="statistics">

        <div className="stat-card">
          <h3>Total Records</h3>
          <h1>{statistics?.total ?? 0}</h1>
        </div>

        <div className="stat-card">
          <h3>Taxpayers</h3>
          <h1>{statistics?.taxpayers ?? 0}</h1>
        </div>

        <div className="stat-card">
          <h3>Tax Assessments</h3>
          <h1>{statistics?.assessments ?? 0}</h1>
        </div>

        <div className="stat-card">
          <h3>EFRIS Transactions</h3>
          <h1>{statistics?.transactions ?? 0}</h1>
        </div>

        <div className="stat-card">
          <h3>Tax Incentives</h3>
          <h1>{statistics?.incentives ?? 0}</h1>
        </div>

      </section>

      <section className="database-section">

        <div className="toolbar">

          <h2>Database Collections</h2>

          <select
            value={selectedCollection}
            onChange={(e) => {
              const collection = e.target.value as CollectionName;

              setSelectedCollection(collection);
              loadCollection(collection);
            }}
          >
            {collections.map((collection) => (
              <option key={collection} value={collection}>
                {collection}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              testConnection();
              loadCollection();
              loadStatistics();
            }}
          >
            Refresh Data
          </button>

        </div>

        <p>
          Records retrieved: <strong>{records.length}</strong>
        </p>

        {loading ? (
          <p>Loading database records...</p>
        ) : records.length === 0 ? (
          <p>No records found in this collection.</p>
        ) : (

          <div className="table-container">


<table className="main-table">

  <thead>
    <tr>
      {Object.keys(records[0]).map((key) => (
        <th key={key}>
          {key.replace(/_/g, ' ')}
        </th>
      ))}
    </tr>
  </thead>

  
{records.map((record, index) => {
  const columns = Object.keys(record);

  const nestedFields = columns.filter(
    key =>
      record[key] !== null &&
      typeof record[key] === 'object'
  );

  return (
    <tbody
      className="record-card"
      key={record._id ?? index}
    >
      {/* MAIN RECORD */}
      <tr className="main-record">
        {columns.map((key) => {
          const value = record[key];

          const isNested =
            value !== null &&
            typeof value === 'object';

          return (
            <td key={key}>
              {isNested ? (
                <span className="nested-indicator">
                  View details below ↓
                </span>
              ) : typeof value === 'boolean' ? (
                value ? 'Yes' : 'No'
              ) : (
                String(value ?? '—')
              )}
            </td>
          );
        })}
      </tr>

      {/* NESTED DETAILS */}
      {nestedFields.length > 0 && (
        <tr className="detail-container">
          <td colSpan={columns.length}>
            <div className="record-details">
              {nestedFields.map((key) => (
                <details key={key}>
                  <summary>
                    {key.replace(/_/g, ' ')}
                  </summary>

                  <div className="nested-content">
                    <NestedData value={record[key]} />
                  </div>
                </details>
              ))}
            </div>
          </td>
        </tr>
      )}
    </tbody>
  );
})}


</table>


          </div>

        )}

      </section>

    </div>
  );
}

export default App;
