import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Profile() {
  const [profile, setProfile] = useState({
    name: '',
    kelas: '',
    email: ''
  });

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (user) {
        setProfile({
          name: user.user_metadata.full_name || '',
          kelas: user.user_metadata.kelas || '',
          email: user.email || ''
        });
      }
    };

    getUser();
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Profile</h2>

      <div className="space-y-3">
        <p><strong>Nama:</strong> {profile.name}</p>
        <p><strong>Email:</strong> {profile.email}</p>
        <p><strong>Kelas:</strong> {profile.kelas}</p>
      </div>
    </div>
  );
}
