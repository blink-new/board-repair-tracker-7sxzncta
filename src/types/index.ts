export interface User {
  id: string;
  email: string;
  name: string;
  role: 'Admin' | 'HQ Staff' | 'Technician';
  branch: string;
  created_at: string;
  updated_at: string;
}

export interface RepairTransfer {
  id: string;
  branch_from: string;
  branch_to: string;
  customer_name: string;
  phone_model: string;
  imei: string;
  passcode?: string;
  problem_description: string;
  staff_receive_name: string;
  date_from_branch: string;
  staff_send_name?: string;
  date_sent_to_branch?: string;
  technician_receive_name?: string;
  date_received_by_tech?: string;
  date_repair_done?: string;
  repair_cost?: number;
  status: 'Pending' | 'Received' | 'In Repair' | 'Done' | 'Returned';
  remarks?: string;
  updated_by: string;
  updated_at: string;
  created_at: string;
  user_id: string;
}

export interface StatusLog {
  id: string;
  transfer_id: string;
  old_status?: string;
  new_status: string;
  remarks?: string;
  updated_by: string;
  updated_at: string;
  user_id: string;
}

export interface NewTransferForm {
  customer_name: string;
  phone_model: string;
  imei: string;
  passcode: string;
  problem_description: string;
  staff_receive_name: string;
  date_from_branch: string;
}

export interface StatusUpdateForm {
  status: RepairTransfer['status'];
  remarks: string;
  technician_receive_name?: string;
  date_received_by_tech?: string;
  date_repair_done?: string;
  repair_cost?: number;
}