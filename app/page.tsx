'use client';

import { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import Image from 'next/image';
import { Download, RefreshCw } from 'lucide-react';

type QRType = 'text' | 'url' | 'email' | 'phone' | 'sms' | 'wifi';

interface QRData {
  text: string;
  url: string;
  email: string;
  emailSubject: string;
  emailBody: string;
  phone: string;
  smsNumber: string;
  smsMessage: string;
  wifiSsid: string;
  wifiPassword: string;
  wifiType: 'WEP' | 'WPA' | 'WPA2' | 'nopass';
}

export default function QRGenerator() {
  const [qrType, setQrType] = useState<QRType>('text');
  const [data, setData] = useState<QRData>({
    text: '',
    url: '',
    email: '',
    emailSubject: '',
    emailBody: '',
    phone: '',
    smsNumber: '',
    smsMessage: '',
    wifiSsid: '',
    wifiPassword: '',
    wifiType: 'WPA2',
  });
  const [qrCode, setQrCode] = useState<string>('');
  const [size, setSize] = useState<number>(256);
  const [color, setColor] = useState<string>('#000000');
  const [bgColor, setBgColor] = useState<string>('#FFFFFF');
  const [margin, setMargin] = useState<number>(4);
  const [errorLevel, setErrorLevel] = useState<'L' | 'M' | 'Q' | 'H'>('M');
  const [downloadFormat, setDownloadFormat] = useState<'png' | 'jpeg' | 'svg'>('png');
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState<number>(25);

  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    generateQRCode();
  }, [data, size, color, bgColor, margin, errorLevel, logoImage, logoSize]);

  const generateQRCode = async () => {
    const qrData = getDataForQRType();
    
    if (!qrData) {
      setQrCode('');
      return;
    }

    try {
      const qrOptions = {
        width: size,
        margin: margin,
        color: {
          dark: color,
          light: bgColor,
        },
        errorCorrectionLevel: errorLevel,
      };

      if (downloadFormat === 'svg') {
        const svg = await QRCode.toString(qrData, {
          type: 'svg',
          ...qrOptions,
        });
        setQrCode(svg);
      } else {
        const imageType = downloadFormat === 'png' ? 'image/png' : 'image/jpeg';
        const options: any = {
          type: imageType,
          ...qrOptions,
        };
        if (downloadFormat === 'jpeg') {
          options.rendererOpts = { quality: 0.92 };
        }
        
        let qrCodeUrl = await (QRCode.toDataURL as any)(qrData, options);
        
        if (logoImage) {
          qrCodeUrl = await addLogoToQRCode(qrCodeUrl, logoImage);
        }
        
        setQrCode(qrCodeUrl as string);
      }
    } catch (error) {
      console.error('QR code generation failed:', error);
    }
  };

  const addLogoToQRCode = async (qrCodeUrl: string, logoUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const qrImage = new (window as any).Image();
      qrImage.crossOrigin = 'anonymous';
      qrImage.src = qrCodeUrl;
      
      qrImage.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }
        
        canvas.width = qrImage.width;
        canvas.height = qrImage.height;
        
        ctx.drawImage(qrImage, 0, 0);
        
        const logoImageObj = new (window as any).Image();
        logoImageObj.crossOrigin = 'anonymous';
        logoImageObj.src = logoUrl;
        
        logoImageObj.onload = () => {
          const calculatedLogoSize = Math.min(canvas.width, canvas.height) * (logoSize / 100);
          const x = (canvas.width - calculatedLogoSize) / 2;
          const y = (canvas.height - calculatedLogoSize) / 2;
          
          ctx.save();
          
          ctx.beginPath();
          ctx.arc(x + calculatedLogoSize / 2, y + calculatedLogoSize / 2, calculatedLogoSize / 2, 0, 2 * Math.PI);
          ctx.clip();
          
          ctx.drawImage(
            logoImageObj, 
            x, 
            y, 
            calculatedLogoSize, 
            calculatedLogoSize
          );
          
          ctx.restore();
          
          resolve(canvas.toDataURL(downloadFormat === 'jpeg' ? 'image/jpeg' : 'image/png'));
        };
        
        logoImageObj.onerror = () => {
          reject(new Error('Failed to load logo'));
        };
      };
      
      qrImage.onerror = () => {
        reject(new Error('Failed to load QR code'));
      };
    });
  };

  // Update QR code when download format changes
  useEffect(() => {
    if (qrCode) {
      generateQRCode();
    }
  }, [downloadFormat]);

  const getDataForQRType = (): string | null => {
    switch (qrType) {
      case 'text':
        return data.text || null;
      
      case 'url':
        if (!data.url) return null;
        const url = data.url.startsWith('http://') || data.url.startsWith('https://') 
          ? data.url 
          : `https://${data.url}`;
        return url;

      case 'email':
        if (!data.email) return null;
        const mailto = `mailto:${data.email}`;
        const subject = data.emailSubject ? `?subject=${encodeURIComponent(data.emailSubject)}` : '';
        const body = data.emailBody ? `${subject ? '&' : '?'}body=${encodeURIComponent(data.emailBody)}` : '';
        return mailto + subject + body;

      case 'phone':
        return data.phone ? `tel:${data.phone}` : null;

      case 'sms':
        if (!data.smsNumber) return null;
        const sms = `smsto:${data.smsNumber}`;
        const message = data.smsMessage ? `:${encodeURIComponent(data.smsMessage)}` : '';
        return sms + message;

      case 'wifi':
        if (!data.wifiSsid) return null;
        const auth = data.wifiType === 'nopass' ? 'nopass' : data.wifiType;
        const password = auth !== 'nopass' && data.wifiPassword ? `;P:${data.wifiPassword}` : '';
        return `WIFI:S:${data.wifiSsid};T:${auth}${password};H:true;;`;

      default:
        return null;
    }
  };

  const handleDownload = () => {
    if (!qrCode) return;

    if (downloadFormat === 'svg') {
      const blob = new Blob([qrCode], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qrcode.${downloadFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      const a = document.createElement('a');
      a.href = qrCode;
      a.download = `qrcode.${downloadFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const handleReset = () => {
    setQrType('text');
    setData({
      text: '',
      url: '',
      email: '',
      emailSubject: '',
      emailBody: '',
      phone: '',
      smsNumber: '',
      smsMessage: '',
      wifiSsid: '',
      wifiPassword: '',
      wifiType: 'WPA2',
    });
    setSize(256);
    setColor('#000000');
    setBgColor('#FFFFFF');
    setMargin(4);
    setErrorLevel('M');
    setDownloadFormat('png');
    setQrCode('');
    setLogoImage(null);
    setLogoSize(25);
  };

  const handleCopy = async () => {
    if (!qrCode) return;

    try {
      if (downloadFormat === 'svg') {
        await navigator.clipboard.writeText(qrCode);
      } else {
        const response = await fetch(qrCode);
        const blob = await response.blob();
        
        if (navigator.clipboard && navigator.clipboard.write) {
          await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob })
          ]);
        } else {
          console.warn('Clipboard API not supported');
          return;
        }
      }
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8 sm:mb-12 lg:mb-16">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4">QR Code Generator</h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto">Create custom QR codes for free</p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-10">
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6 lg:p-8">
            <div className="mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-4">QR Code Details</h2>
              
              <div className="mb-4">
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={qrType}
                  onChange={(e) => setQrType(e.target.value as QRType)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900"
                >
                  <option value="text">Plain Text</option>
                  <option value="url">URL</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="sms">SMS</option>
                  <option value="wifi">WiFi</option>
                </select>
              </div>

              {qrType === 'text' && (
                <div className="mb-4">
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">Text</label>
                  <textarea
                    value={data.text}
                    onChange={(e) => setData({ ...data, text: e.target.value })}
                    placeholder="Enter your text..."
                    rows={4}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none text-gray-900 placeholder-gray-500"
                  />
                </div>
              )}

              {qrType === 'url' && (
                <div className="mb-4">
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">URL</label>
                  <input
                    type="url"
                    value={data.url}
                    onChange={(e) => setData({ ...data, url: e.target.value })}
                    placeholder="https://example.com"
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                  />
                </div>
              )}

              {qrType === 'email' && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={data.email}
                      onChange={(e) => setData({ ...data, email: e.target.value })}
                      placeholder="example@email.com"
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">Subject</label>
                    <input
                      type="text"
                      value={data.emailSubject}
                      onChange={(e) => setData({ ...data, emailSubject: e.target.value })}
                      placeholder="Email subject (optional)"
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">Message</label>
                    <textarea
                      value={data.emailBody}
                      onChange={(e) => setData({ ...data, emailBody: e.target.value })}
                      placeholder="Email message (optional)"
                      rows={3}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none text-gray-900 placeholder-gray-500"
                    />
                  </div>
                </>
              )}

              {qrType === 'phone' && (
                <div className="mb-4">
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={data.phone}
                    onChange={(e) => setData({ ...data, phone: e.target.value })}
                    placeholder="+1234567890"
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                  />
                </div>
              )}

              {qrType === 'sms' && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={data.smsNumber}
                      onChange={(e) => setData({ ...data, smsNumber: e.target.value })}
                      placeholder="+1234567890"
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">Message</label>
                    <textarea
                      value={data.smsMessage}
                      onChange={(e) => setData({ ...data, smsMessage: e.target.value })}
                      placeholder="SMS message (optional)"
                      rows={3}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none text-gray-900 placeholder-gray-500"
                    />
                  </div>
                </>
              )}

              {qrType === 'wifi' && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">WiFi SSID</label>
                    <input
                      type="text"
                      value={data.wifiSsid}
                      onChange={(e) => setData({ ...data, wifiSsid: e.target.value })}
                      placeholder="WiFi name"
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">WiFi Password</label>
                    <input
                      type="password"
                      value={data.wifiPassword}
                      onChange={(e) => setData({ ...data, wifiPassword: e.target.value })}
                      placeholder="WiFi password"
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">Security Type</label>
                    <select
                      value={data.wifiType}
                      onChange={(e) => setData({ ...data, wifiType: e.target.value as 'WEP' | 'WPA' | 'WPA2' | 'nopass' })}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900"
                    >
                      <option value="WPA2">WPA2</option>
                      <option value="WPA">WPA</option>
                      <option value="WEP">WEP</option>
                      <option value="nopass">No Password</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-4">Customization</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Size: {size}px</label>
                  <input
                    type="range"
                    min="100"
                    max="1000"
                    value={size}
                    onChange={(e) => setSize(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Margin: {margin}px</label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={margin}
                    onChange={(e) => setMargin(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Foreground Color</label>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full h-12 sm:h-14 rounded-lg cursor-pointer border-0 p-0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Background Color</label>
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-full h-12 sm:h-14 rounded-lg cursor-pointer border-0 p-0"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Error Correction Level</label>
                  <select
                    value={errorLevel}
                    onChange={(e) => setErrorLevel(e.target.value as 'L' | 'M' | 'Q' | 'H')}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900"
                  >
                    <option value="L">Low (7%) - Smallest</option>
                    <option value="M">Medium (15%) - Default</option>
                    <option value="Q">Quartile (25%) - Medium</option>
                    <option value="H">High (30%) - Largest</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Logo Image</label>
                  <div className="flex items-center gap-4">
                    <label className="flex-1 flex items-center justify-center px-3 sm:px-4 py-2 sm:py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-gray-50 transition-all cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              setLogoImage(event.target?.result as string);
                            };
                            reader.readAsDataURL(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />
                      <span className="text-sm text-gray-600">
                        {logoImage ? 'Change Logo' : 'Upload Logo'}
                      </span>
                    </label>
                    {logoImage && (
                      <button
                        onClick={() => setLogoImage(null)}
                        className="px-3 sm:px-4 py-2 sm:py-3 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-all"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {logoImage && (
                    <>
                      <div className="mt-3 flex items-center gap-3">
                        <Image
                          src={logoImage}
                          alt="Logo Preview"
                          width={60}
                          height={60}
                          className="rounded-lg object-contain"
                        />
                        <span className="text-sm text-gray-600">Logo added successfully</span>
                      </div>
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Logo Size: {logoSize}%</label>
                        <input
                          type="range"
                          min="10"
                          max="40"
                          value={logoSize}
                          onChange={(e) => setLogoSize(Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <button
                onClick={handleDownload}
                disabled={!qrCode}
                className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
              >
                <Download size={20} />
                Download
              </button>
              <button
                onClick={handleReset}
                className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-all"
              >
                <RefreshCw size={20} />
                Reset
              </button>
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6 lg:p-8">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-4">Preview</h2>
            
            <div ref={canvasRef} className="mb-6">
              {qrCode ? (
                <div className="relative mx-auto" style={{ width: `${Math.min(size, 400)}px`, height: `${Math.min(size, 400)}px` }}>
                  {qrCode.startsWith('<svg') ? (
                    <div 
                      dangerouslySetInnerHTML={{ __html: qrCode.trim() }} 
                      className="w-full h-full rounded-lg shadow-md"
                    />
                  ) : (
                    <Image
                      src={qrCode}
                      alt="QR Code Preview"
                      width={Math.min(size, 400)}
                      height={Math.min(size, 400)}
                      className="rounded-lg shadow-md w-full h-full"
                    />
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 sm:h-80 lg:h-96 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-gray-400 text-5xl sm:text-6xl mb-4">📱</div>
                    <p className="text-gray-500 text-base sm:text-lg">QR code preview will appear here</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-6 sm:mb-8">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-3">Download Settings</h3>
              
              <div className="mb-4">
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">Format</label>
                <select
                  value={downloadFormat}
                  onChange={(e) => setDownloadFormat(e.target.value as 'png' | 'jpeg' | 'svg')}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900"
                >
                  <option value="png">PNG</option>
                  <option value="jpeg">JPEG</option>
                  <option value="svg">SVG</option>
                </select>
              </div>


            </div>
          </section>
        </main>

        <footer className="text-center mt-8 sm:mt-12 lg:mt-16 text-gray-600 text-sm sm:text-base">
          <p>Built by Kanishk Kumar Singh</p>
        </footer>
      </div>

      {showSuccess && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg transform translate-x-0 transition-transform duration-300">
          QR code downloaded successfully!
        </div>
      )}
    </div>
  );
}
