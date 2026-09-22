import React from 'react';
import { AccessManagementView } from '../components/gestion-usuarios-empresas/screens/AccessManagementView';
import '../components/gestion-usuarios-empresas/styles/accessManagement.css';

export const UsuariosView = ({ scope = 'STUDY' }) => <AccessManagementView scope={scope} />;
