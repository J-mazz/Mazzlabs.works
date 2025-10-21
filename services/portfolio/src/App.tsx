import React, { useEffect } from 'react';
import Hero from './components/Hero';
import Project from './components/Project';
import About from './components/About';
import Contact from './components/Contact';

function App() {
  useEffect(() => {
    // Smooth scroll behavior
    document.documentElement.style.scrollBehavior = 'smooth';

    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

  return (
    <div className="App">
      <Hero />
      <Project />
      <About />
      <Contact />
    </div>
  );
}

export default App;
