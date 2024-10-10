import React, { useState, useEffect } from 'react';
import Preloader from './Preloader';
import NothingFound from './NothingFound';

function DataComponent() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    fetch('https://cloudinary/data')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Something went wrong during the request.');
        }
        return response.json();
      })
      .then((result) => {
        if (result && result.length > 0) {
          setData(result);
        } else {
          setData([]);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        setError('Sorry, something went wrong during the request. Please try again later.');
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return <Preloader />;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (data.length === 0) {
    return <NothingFound />;
  }

  return (
    <div>
      {data.map((item) => (
        <div key={item.id} className="data-item">
          <h3>{item.title}</h3>
          <p>{item.description}</p>
        </div>
      ))}
    </div>
  );
}

export default DataComponent;