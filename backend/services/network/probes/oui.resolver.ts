export interface OuiResolution {
  mac: string;
  tipoMac: 'UNIVERSAL' | 'LOCAL_ADMINISTERED';
  fabricante: string | null;
  rolSugerido?: string;
  isVirtualNic: boolean;
}

export class OuiResolver {
  private static FULL_OUI: Record<string, string> | null = null;
  private static loadFullOui(): Record<string, string> {
    if (this.FULL_OUI) return this.FULL_OUI;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      this.FULL_OUI = require('../../../data/oui.json');
    } catch {
      this.FULL_OUI = {};
    }
    return this.FULL_OUI;
  }

  // Prefijos OUI comunes de 24 bits (primeros 3 octetos en mayúsculas sin separador)
  private static readonly OUI_DATABASE: Record<string, { vendor: string; isVirtual?: boolean; suggestedRole?: string }> = {
    // Fortinet
    '00090F': { vendor: 'Fortinet, Inc.', suggestedRole: 'GATEWAY' },
    '704C5C': { vendor: 'Fortinet, Inc.', suggestedRole: 'GATEWAY' },
    '085B0E': { vendor: 'Fortinet, Inc.', suggestedRole: 'GATEWAY' },
    '906C59': { vendor: 'Fortinet, Inc.', suggestedRole: 'GATEWAY' },

    // Cisco
    '00000C': { vendor: 'Cisco Systems', suggestedRole: 'SWITCH' },
    '000142': { vendor: 'Cisco Systems', suggestedRole: 'SWITCH' },
    '001B54': { vendor: 'Cisco Systems', suggestedRole: 'SWITCH' },

    // Ubiquiti Networks
    '002722': { vendor: 'Ubiquiti Networks', suggestedRole: 'AP' },
    '0418D6': { vendor: 'Ubiquiti Networks', suggestedRole: 'AP' },
    '24A43C': { vendor: 'Ubiquiti Networks', suggestedRole: 'AP' },
    '68D79A': { vendor: 'Ubiquiti Networks', suggestedRole: 'AP' },
    '788A20': { vendor: 'Ubiquiti Networks', suggestedRole: 'AP' },
    'FCECDA': { vendor: 'Ubiquiti Networks', suggestedRole: 'AP' },

    // MikroTik
    '000C42': { vendor: 'MikroTik', suggestedRole: 'ROUTER' },
    '488F5A': { vendor: 'MikroTik', suggestedRole: 'ROUTER' },
    '64D154': { vendor: 'MikroTik', suggestedRole: 'ROUTER' },
    'CC2DE0': { vendor: 'MikroTik', suggestedRole: 'ROUTER' },

    // Virtual NICs (Marcadas como virtuales, pero no determinan al 100% que sea una VM física)
    '005056': { vendor: 'VMware, Inc.', isVirtual: true, suggestedRole: 'POSIBLE_VIRTUAL' },
    '000C29': { vendor: 'VMware, Inc.', isVirtual: true, suggestedRole: 'POSIBLE_VIRTUAL' },
    '000569': { vendor: 'VMware, Inc.', isVirtual: true, suggestedRole: 'POSIBLE_VIRTUAL' },
    '00155D': { vendor: 'Microsoft (Hyper-V)', isVirtual: true, suggestedRole: 'POSIBLE_VIRTUAL' },
    '080027': { vendor: 'PCS Systemtechnik (VirtualBox)', isVirtual: true, suggestedRole: 'POSIBLE_VIRTUAL' },
    '525400': { vendor: 'QEMU / KVM', isVirtual: true, suggestedRole: 'POSIBLE_VIRTUAL' },

    // Workstations & Chipsets
    '001E67': { vendor: 'Intel Corporate', suggestedRole: 'ENDPOINT' },
    '00215A': { vendor: 'HP Inc.', suggestedRole: 'ENDPOINT' },
    '3CD92B': { vendor: 'Hewlett Packard', suggestedRole: 'ENDPOINT' },
    'D89EF3': { vendor: 'Dell Inc.', suggestedRole: 'ENDPOINT' },
    '1866DA': { vendor: 'Dell Inc.', suggestedRole: 'ENDPOINT' },
    '001A4B': { vendor: 'Hewlett Packard', suggestedRole: 'ENDPOINT' },
    '28D244': { vendor: 'LCFC(HeFei) Electronics (Lenovo)', suggestedRole: 'ENDPOINT' },
    '54EE75': { vendor: 'Wistron InfoComm', suggestedRole: 'ENDPOINT' },
    '408D5C': { vendor: 'Giga-Byte Technology', suggestedRole: 'ENDPOINT' },
    '04D9F5': { vendor: 'ASUSTek Computer', suggestedRole: 'ENDPOINT' },

    // Telefonía VoIP
    '00085D': { vendor: 'Aastra Telecom', suggestedRole: 'VOIP' },
    '0004F2': { vendor: 'Polycom', suggestedRole: 'VOIP' },
    '000B82': { vendor: 'Grandstream Networks', suggestedRole: 'VOIP' },
    '805E0C': { vendor: 'Yealink Network Technology', suggestedRole: 'VOIP' },

    // Cámaras de Seguridad / NVR
    '38AF29': { vendor: 'Dahua Technology', suggestedRole: 'CAMARA' },
    'BC325F': { vendor: 'Hikvision Digital Technology', suggestedRole: 'CAMARA' },

    // Impresoras de red
    '001BEE': { vendor: 'Brother Industries', suggestedRole: 'PRINTER' },
    '008077': { vendor: 'Brother Industries', suggestedRole: 'PRINTER' },
    '000085': { vendor: 'Canon Inc.', suggestedRole: 'PRINTER' },
    '001599': { vendor: 'Samsung Electronics', suggestedRole: 'PRINTER' },

    // Huawei / Hui Zhou (detectados en Advanced IP Scanner)
    '546990': { vendor: 'HUAWEI TECHNOLOGIES CO.,LTD' },
    '28AD18': { vendor: 'Hui Zhou Gaoshengda Technology Co.,LTD' },
    'C0D2F3': { vendor: 'Hui Zhou Gaoshengda Technology Co.,LTD' },
    '04A82A': { vendor: 'HUAWEI TECHNOLOGIES CO.,LTD' }
  };

  /**
   * Normaliza una dirección MAC al formato XX:XX:XX:XX:XX:XX
   */
  static normalizeMac(mac: string): string | null {
    if (!mac || typeof mac !== 'string') return null;
    const clean = mac.replace(/[^0-9a-fA-F]/g, '').toUpperCase();
    if (clean.length !== 12) return null;
    return clean.match(/.{1,2}/g)?.join(':') || null;
  }

  /**
   * Resuelve fabricante y características de una dirección MAC.
   * IMPORTANTE V3:
   * 1. Si el bit U/L está activo, es Locally Administered (LAA), NO "aleatoria confirmada".
   * 2. Si el OUI es de VMware/Hyper-V, se marca isVirtualNic=true, pero no asegura 100% VM.
   */
  static resolve(rawMac: string): OuiResolution {
    const mac = this.normalizeMac(rawMac);
    if (!mac) {
      return {
        mac: rawMac,
        tipoMac: 'UNIVERSAL',
        fabricante: null,
        isVirtualNic: false
      };
    }

    const firstByte = parseInt(mac.substring(0, 2), 16);
    // Bit 1 del octeto 0 (0-indexed): 0b00000010 = 0x02 indica Locally Administered
    const isLocal = (firstByte & 0x02) !== 0;
    const tipoMac = isLocal ? 'LOCAL_ADMINISTERED' : 'UNIVERSAL';

    const prefix = mac.replace(/:/g, '').substring(0, 6);
    const matched = this.OUI_DATABASE[prefix];
    const fullVendor = this.loadFullOui()[prefix];
    const vendor = matched?.vendor || (fullVendor && fullVendor !== 'Private' ? fullVendor : null);

    return {
      mac,
      tipoMac,
      fabricante: isLocal ? 'Administrada Localmente (LAA)' : (vendor || 'Desconocido'),
      rolSugerido: matched?.suggestedRole || 'ENDPOINT',
      isVirtualNic: !!matched?.isVirtual
    };
  }
}
