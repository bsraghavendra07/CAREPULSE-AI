export interface FHIRResource {
  resourceType: string;
  id?: string;
  meta?: {
    profile?: string[];
    tag?: Array<{ system: string; code: string; display: string }>;
  };
  [key: string]: any;
}

export interface FHIRBundle extends FHIRResource {
  resourceType: 'Bundle';
  type: string;
  total?: number;
  entry?: Array<{
    fullUrl?: string;
    resource: FHIRResource;
  }>;
}

