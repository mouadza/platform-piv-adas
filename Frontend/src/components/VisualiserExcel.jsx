import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../api';
import { getAccessToken } from '../utils/authStorage';

const VisualiserExcel = () => {
  const { gammeId } = useParams();
  const [data, setData] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      navigate('/login');
      return;
    }

    fetch(`${API_BASE_URL}/admin_config/gamme/${gammeId}/open/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(json => setData(json.rows))
      .catch(err => console.error(err));
  }, [gammeId, navigate]);

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Aperçu du fichier</h2>
      <button onClick={() => navigate(-1)} className="mb-4 text-blue-600 underline">Retour</button>
      <div className="overflow-auto max-w-full border rounded-lg">
        <table className="min-w-full border-collapse">
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, colIndex) => (
                  <td
                    key={colIndex}
                    className="border p-2 text-sm"
                    style={{ backgroundColor: cell.color }}
                  >
                    {cell.value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VisualiserExcel;
