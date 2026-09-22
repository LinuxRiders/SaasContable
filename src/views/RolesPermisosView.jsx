import React from 'react';
import { RolesManagementView } from '../components/gestion-usuarios-empresas/screens/RolesManagementView';
import '../components/gestion-usuarios-empresas/styles/accessManagement.css';

export const RolesPermisosView = ({ scope = 'STUDY' }) => <RolesManagementView scope={scope} />;
