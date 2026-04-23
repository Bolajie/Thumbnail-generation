import React from 'react';

export default function InputForm({ formData, setFormData }) {
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const inputStyle = {
    width: '100%',
    background: '#1E1E1E',
    border: '1px solid #1E1E1E',
    color: '#FFFFFF',
    padding: '12px',
    borderRadius: '8px',
    fontFamily: 'Montserrat, sans-serif',
    marginBottom: '1.5rem',
    outline: 'none'
  };

  const labelStyle = {
    display: 'block',
    color: '#888888',
    marginBottom: '8px',
    fontFamily: 'Montserrat, sans-serif',
    fontSize: '14px'
  };

  return (
    <div>
      <label style={labelStyle}>Guest Name</label>
      <input type="text" name="guestName" value={formData.guestName} onChange={handleChange} style={inputStyle} placeholder="e.g. Jane Doe" />

      <label style={labelStyle}>Industry</label>
      <select name="industry" value={formData.industry} onChange={handleChange} style={inputStyle}>
        <option value="">Select Industry</option>
        {['Finance', 'Real Estate', 'Fitness', 'Corporate', 'Entertainment', 'Wellness', 'Legal', 'Tech', 'Other'].map(ind => (
          <option key={ind} value={ind.toLowerCase()}>{ind}</option>
        ))}
      </select>

      <label style={labelStyle}>Show</label>
      <select name="show" value={formData.show} onChange={handleChange} style={inputStyle}>
        <option value="">Select Show</option>
        <option value="legacy-makers">Legacy Makers</option>
        <option value="women-in-power">Women in Power</option>
        <option value="operation-ceo">Operation CEO</option>
        <option value="office-lockdown">Office Lockdown</option>
        <option value="americas-top-lawyer">America's Top Lawyer</option>
        <option value="general-awards">General / Awards</option>
      </select>

      <label style={labelStyle}>Prompt Style</label>
      <select name="style" value={formData.style} onChange={handleChange} style={inputStyle}>
        <option value="">Select Style</option>
        <option value="cinematic-gold">Cinematic Gold</option>
        <option value="modern-corporate">Modern Corporate</option>
        <option value="gritty-action">Gritty Action</option>
        <option value="vibrant-tech">Vibrant Tech</option>
      </select>

      <label style={labelStyle}>Episode Duration</label>
      <input type="text" name="duration" value={formData.duration} onChange={handleChange} style={inputStyle} placeholder="e.g. 22:53" />
    </div>
  );
}
