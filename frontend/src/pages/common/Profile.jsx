import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { accountService } from "../../services";
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Briefcase,
  GraduationCap,
  ShieldCheck,
  Baby,
  IdCard,
  Droplets,
  HeartPulse,
  Clock,
} from "lucide-react";

export default function Profile() {
  const { user, isStudent, isTeacher, isParent, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data } = await accountService.getMe();
      setProfileData(data);
    } catch (err) {
      console.error("Failed to load profile", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#2563EB] border-t-transparent"></div>
        <p className="mt-4 text-gray-500 font-medium">Loading profile...</p>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center text-red-600">
        <p className="font-medium">Failed to load profile information</p>
      </div>
    );
  }

  const profile = profileData.profile;

  const InfoItem = ({ icon: Icon, label, value }) => (
    <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="mt-1 rounded-md bg-blue-50 p-2">
        <Icon className="h-4 w-4 text-[#2563EB]" />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {label}
        </label>
        <p className="text-sm font-medium text-gray-900">{value || "—"}</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">My Profile</h1>

      {/* Profile Header Card */}
      <div className="mb-8 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="h-32 bg-gradient-to-r from-[#2563EB] to-blue-400"></div>
        <div className="relative px-8 pb-8">
          <div className="relative -mt-16 mb-4 inline-block">
            {profileData.profile_picture ? (
              <img
                src={profileData.profile_picture}
                alt="Profile"
                className="h-32 w-32 rounded-2xl border-4 border-white object-cover shadow-md"
              />
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-2xl border-4 border-white bg-gray-100 shadow-md">
                <User className="h-16 w-16 text-gray-300" />
              </div>
            )}
            <div className="absolute bottom-2 right-2 rounded-full bg-green-500 p-1.5 border-2 border-white"></div>
          </div>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {profileData.full_name || profileData.username}
              </h2>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-[#2563EB] uppercase border border-blue-100">
                  {profileData.user_type}
                </span>
                <span className="text-sm text-gray-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Joined{" "}
                  {new Date().getFullYear()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Basic Information Grid */}
        <div className="border-t border-gray-50 p-8">
          <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-gray-800">
            <ShieldCheck className="h-5 w-5 text-[#2563EB]" />
            Account Details
          </h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem
              icon={User}
              label="Username"
              value={profileData.username}
            />
            <InfoItem
              icon={Mail}
              label="Email Address"
              value={profileData.email}
            />
            <InfoItem
              icon={Phone}
              label="Phone Number"
              value={profileData.phone_number}
            />
            <InfoItem
              icon={Calendar}
              label="Date of Birth"
              value={
                profileData.date_of_birth
                  ? new Date(profileData.date_of_birth).toLocaleDateString()
                  : null
              }
            />
            <InfoItem
              icon={MapPin}
              label="Residential Address"
              value={profileData.address}
            />
          </div>
        </div>
      </div>

      {/* Role Specific Section */}
      <div className="grid grid-cols-1 gap-8">
        {/* Student-Specific */}
        {isStudent && profile && (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-gray-800">
              <GraduationCap className="h-5 w-5 text-[#2563EB]" />
              Academic Profile
            </h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <InfoItem
                icon={IdCard}
                label="Student ID"
                value={profile.student_id}
              />
              <InfoItem
                icon={Calendar}
                label="Admission Date"
                value={
                  profile.admission_date
                    ? new Date(profile.admission_date).toLocaleDateString()
                    : null
                }
              />
              <InfoItem
                icon={Droplets}
                label="Blood Group"
                value={profile.blood_group}
              />
              <InfoItem
                icon={User}
                label="Guardian Name"
                value={profile.guardian_name}
              />
              <InfoItem
                icon={Phone}
                label="Guardian Phone"
                value={profile.guardian_phone}
              />
              <InfoItem
                icon={HeartPulse}
                label="Emergency Contact"
                value={profile.emergency_contact}
              />
              {profile.current_enrollment && (
                <InfoItem
                  icon={Briefcase}
                  label="Current Class"
                  value={profile.current_enrollment.class_name}
                />
              )}
            </div>
          </div>
        )}

        {/* Teacher-Specific */}
        {isTeacher && profile && (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-gray-800">
              <Briefcase className="h-5 w-5 text-[#2563EB]" />
              Professional Details
            </h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <InfoItem
                icon={IdCard}
                label="Employee ID"
                value={profile.employee_id}
              />
              <InfoItem
                icon={GraduationCap}
                label="Qualification"
                value={profile.qualification}
              />
              <InfoItem
                icon={Clock}
                label="Experience"
                value={
                  profile.experience_years
                    ? `${profile.experience_years} Years`
                    : null
                }
              />
              <InfoItem
                icon={ShieldCheck}
                label="Specialization"
                value={profile.specialization}
              />
              <InfoItem
                icon={Calendar}
                label="Joining Date"
                value={
                  profile.joining_date
                    ? new Date(profile.joining_date).toLocaleDateString()
                    : null
                }
              />
            </div>
          </div>
        )}

        {/* Admin-Specific */}
        {isAdmin && profile && (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-gray-800">
              <ShieldCheck className="h-5 w-5 text-[#2563EB]" />
              Administrative Details
            </h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <InfoItem
                icon={IdCard}
                label="Employee ID"
                value={profile.employee_id}
              />
              <InfoItem
                icon={Briefcase}
                label="Department"
                value={profile.department}
              />
            </div>
          </div>
        )}

        {/* Parent-Specific */}
        {isParent && profile && (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-gray-800">
              <Baby className="h-5 w-5 text-[#2563EB]" />
              Family Information
            </h3>
            <div className="mb-8">
              <InfoItem
                icon={Briefcase}
                label="Occupation"
                value={profile.occupation}
              />
            </div>

            {profile.children && profile.children.length > 0 && (
              <div>
                <h4 className="mb-4 text-sm font-bold uppercase tracking-widest text-gray-400">
                  Linked Children
                </h4>
                <div className="overflow-hidden rounded-xl border border-gray-100">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold uppercase text-gray-500">
                          Student ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-bold uppercase text-gray-500">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-bold uppercase text-gray-500">
                          Guardian Contact
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {profile.children.map((child) => (
                        <tr
                          key={child.id}
                          className="hover:bg-blue-50/30 transition-colors"
                        >
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-bold text-[#2563EB]">
                            {child.student_id}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                            {child.user?.full_name ||
                              child.user?.username ||
                              "—"}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            <div className="flex flex-col">
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />{" "}
                                {child.guardian_phone}
                              </span>
                              <span className="flex items-center gap-1 text-xs opacity-70">
                                <Mail className="h-3 w-3" />{" "}
                                {child.guardian_email}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}